"use client";

import { inventoryApi, transfersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { getMutationErrorMessage } from "@/lib/mutation-error";
import type {
  InventoryLotDto,
  ShipTransferLineInput,
  TransferDto,
  TransferLineDto,
  TransferStatus,
} from "@drug-store/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@drug-store/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const statusLabels: Record<TransferStatus, string> = {
  draft: "Draft",
  in_transit: "In transit",
  received: "Received",
  received_with_variance: "Received (variance)",
};

const statusVariants: Record<TransferStatus, "default" | "success" | "warning"> = {
  draft: "default",
  in_transit: "warning",
  received: "success",
  received_with_variance: "warning",
};

type AllocationRow = {
  id: string;
  lotId: string;
  quantity: string;
};

const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { state } = useAuthContext();
  const [transfer, setTransfer] = useState<TransferDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lotsByMedicineId, setLotsByMedicineId] = useState<Record<string, InventoryLotDto[]>>({});
  const [overrideByLine, setOverrideByLine] = useState<Record<string, boolean>>({});
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [allocationsByLine, setAllocationsByLine] = useState<Record<string, AllocationRow[]>>({});
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, string>>({});

  const isSourceBranch = transfer?.sourceBranchId === state.activeBranchId;
  const isDestinationBranch = transfer?.destinationBranchId === state.activeBranchId;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await transfersApi.getTransfer(id);
      setTransfer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!transfer || transfer.status !== "draft" || !isSourceBranch) return;
    const loadLots = async () => {
      const entries = await Promise.all(
        transfer.lines.map(async (line) => {
          const res = await inventoryApi.listLots({ medicineId: line.medicineId });
          return [line.medicineId, res.items.filter((lot) => lot.quantityOnHand > 0)] as const;
        }),
      );
      setLotsByMedicineId(Object.fromEntries(entries));
    };
    void loadLots();
  }, [transfer, isSourceBranch]);

  useEffect(() => {
    if (!transfer || transfer.status !== "in_transit" || !isDestinationBranch) return;
    const next: Record<string, string> = {};
    for (const line of transfer.lines) {
      for (const allocation of line.allocations) {
        next[allocation.id] = String(allocation.quantityShipped);
      }
    }
    setReceivedQuantities(next);
  }, [transfer, isDestinationBranch]);

  const handleAddAllocation = (lineId: string) => {
    setAllocationsByLine((prev) => ({
      ...prev,
      [lineId]: [...(prev[lineId] ?? []), { id: createRowId(), lotId: "", quantity: "1" }],
    }));
  };

  const updateAllocation = (lineId: string, rowId: string, patch: Partial<AllocationRow>) => {
    setAllocationsByLine((prev) => ({
      ...prev,
      [lineId]: (prev[lineId] ?? []).map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }));
  };

  const removeAllocation = (lineId: string, rowId: string) => {
    setAllocationsByLine((prev) => ({
      ...prev,
      [lineId]: (prev[lineId] ?? []).filter((row) => row.id !== rowId),
    }));
  };

  const buildShipPayload = (): { lines?: ShipTransferLineInput[] } | null => {
    setError(null);
    if (!transfer) return null;
    const lines: ShipTransferLineInput[] = [];
    for (const line of transfer.lines) {
      if (!overrideByLine[line.id]) continue;
      const reason = overrideReasons[line.id]?.trim() || "";
      const allocations = allocationsByLine[line.id] ?? [];
      if (!reason) {
        setError("Override reason is required for manual allocations.");
        return null;
      }
      if (!allocations.length) {
        setError("Add at least one allocation for each override line.");
        return null;
      }
      const cleaned = allocations
        .filter((allocation) => allocation.lotId)
        .map((allocation) => ({
          lotId: allocation.lotId,
          quantity: Number(allocation.quantity),
        }));
      for (const allocation of cleaned) {
        if (!Number.isFinite(allocation.quantity) || allocation.quantity <= 0) {
          setError("Allocation quantities must be greater than zero.");
          return null;
        }
      }
      lines.push({
        transferLineId: line.id,
        overrideReason: reason,
        allocations: cleaned,
      });
    }
    return { lines: lines.length ? lines : undefined };
  };

  const handleShip = async () => {
    if (!id) return;
    const payload = buildShipPayload();
    if (!payload) return;
    setLoading(true);
    try {
      const updated = await transfersApi.shipTransfer(id, payload);
      setTransfer(updated);
      await load();
    } catch (err) {
      setError(getMutationErrorMessage(err, "Transfer was not shipped."));
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!id || !transfer) return;
    setError(null);
    const allocations = transfer.lines.flatMap((line) =>
      line.allocations.map((allocation) => ({
        allocationId: allocation.id,
        quantityReceived: Number(receivedQuantities[allocation.id] ?? allocation.quantityShipped),
      })),
    );
    for (const allocation of allocations) {
      if (!Number.isFinite(allocation.quantityReceived) || allocation.quantityReceived < 0) {
        setError("Received quantities must be zero or more.");
        return;
      }
    }
    setLoading(true);
    try {
      const updated = await transfersApi.receiveTransfer(id, { allocations });
      setTransfer(updated);
      await load();
      router.push("/transfers");
    } catch (err) {
      setError(getMutationErrorMessage(err, "Transfer receipt was not saved."));
    } finally {
      setLoading(false);
    }
  };

  const canShip = transfer?.status === "draft" && isSourceBranch;
  const canReceive = transfer?.status === "in_transit" && isDestinationBranch;

  const renderLineRow = (line: TransferLineDto) => (
    <tr key={line.id} className="transition-colors hover:bg-surface_container_high">
      <td className="px-4 py-4 text-on_surface">{line.medicine?.name ?? line.medicineId}</td>
      <td className="px-4 py-4 text-on_surface_variant">{line.quantity}</td>
      <td className="px-4 py-4 text-on_surface_variant">
        {line.allocations.length
          ? line.allocations.map((allocation) => allocation.lotCode).join(", ")
          : "—"}
      </td>
    </tr>
  );

  if (loading && !transfer) {
    return <p className="text-sm text-gray-500">Loading transfer…</p>;
  }

  if (!transfer) {
    return (
      <div className="max-w-xl">
        <Alert variant="destructive">{error ?? "Transfer not found."}</Alert>
        <Link href="/transfers" className="text-sm text-primary underline">
          Back to transfers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer</h1>
          <p className="mt-1 text-sm text-gray-500">Transfer {transfer.id}</p>
        </div>
        <Badge variant={statusVariants[transfer.status]}>{statusLabels[transfer.status]}</Badge>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">Source</p>
            <p className="font-medium text-on_surface">{transfer.sourceBranch?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">
              Destination
            </p>
            <p className="font-medium text-on_surface">{transfer.destinationBranch?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">Notes</p>
            <p className="text-on_surface">{transfer.notes || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">
              Ship status
            </p>
            <p className="text-on_surface">
              {transfer.shippedAt ? new Date(transfer.shippedAt).toLocaleString() : "Not shipped"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
            <table className="w-full text-left text-sm text-on_surface_variant">
              <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                <tr>
                  <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Medicine
                  </th>
                  <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Qty
                  </th>
                  <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Lots
                  </th>
                </tr>
              </thead>
              <tbody>{transfer.lines.map(renderLineRow)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canShip && (
        <Card>
          <CardHeader>
            <CardTitle>Ship transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-on_surface_variant">
              FEFO allocation is used by default. Enable overrides to pick specific lots.
            </p>
            {transfer.lines.map((line) => {
              const lots = lotsByMedicineId[line.medicineId] ?? [];
              const overrideEnabled = overrideByLine[line.id] ?? false;
              const allocations = allocationsByLine[line.id] ?? [];
              return (
                <div
                  key={line.id}
                  className="rounded-lg border border-outline_variant/20 space-y-4 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-on_surface">
                        {line.medicine?.name ?? line.medicineId}
                      </p>
                      <p className="text-xs text-on_surface_variant">Quantity: {line.quantity}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-on_surface">
                      <input
                        type="checkbox"
                        checked={overrideEnabled}
                        onChange={(e) =>
                          setOverrideByLine((prev) => ({
                            ...prev,
                            [line.id]: e.target.checked,
                          }))
                        }
                      />
                      Override FEFO
                    </label>
                  </div>

                  {overrideEnabled && (
                    <>
                      <div>
                        <label
                          htmlFor={`override-${line.id}`}
                          className="mb-1.5 block text-sm font-medium text-gray-700"
                        >
                          Override reason
                        </label>
                        <Textarea
                          id={`override-${line.id}`}
                          value={overrideReasons[line.id] ?? ""}
                          onChange={(e) =>
                            setOverrideReasons((prev) => ({
                              ...prev,
                              [line.id]: e.target.value,
                            }))
                          }
                          placeholder="Explain why FEFO is being overridden"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-on_surface">Allocations</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddAllocation(line.id)}
                          >
                            Add lot
                          </Button>
                        </div>
                        {allocations.length === 0 ? (
                          <p className="text-xs text-on_surface_variant">
                            Add lots and quantities to override FEFO.
                          </p>
                        ) : (
                          allocations.map((allocation) => (
                            <div
                              key={allocation.id}
                              className="grid gap-3 rounded-lg border border-outline_variant/20 bg-surface_container_lowest p-3 md:grid-cols-[2fr_1fr_auto]"
                            >
                              <select
                                value={allocation.lotId}
                                onChange={(e) =>
                                  updateAllocation(line.id, allocation.id, {
                                    lotId: e.target.value,
                                  })
                                }
                                className="h-10 w-full rounded-md border border-outline_variant/40 bg-white px-3 text-sm text-on_surface"
                              >
                                <option value="">Select lot</option>
                                {lots.map((lot) => (
                                  <option key={lot.id} value={lot.id}>
                                    {lot.lotCode} · exp {lot.expiryDate} · {lot.quantityOnHand} qty
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                min="1"
                                value={allocation.quantity}
                                onChange={(e) =>
                                  updateAllocation(line.id, allocation.id, {
                                    quantity: e.target.value,
                                  })
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => removeAllocation(line.id, allocation.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end">
              <Button type="button" onClick={handleShip} disabled={loading}>
                Ship transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canReceive && (
        <Card>
          <CardHeader>
            <CardTitle>Receive transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-on_surface_variant">
              Confirm received quantities for each shipped lot. Adjust quantities to record
              variance.
            </p>
            <div className="space-y-3">
              {transfer.lines.map((line) => (
                <div
                  key={line.id}
                  className="rounded-lg border border-outline_variant/20 space-y-3 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-on_surface">
                      {line.medicine?.name ?? line.medicineId}
                    </p>
                    <p className="text-xs text-on_surface_variant">Expected qty: {line.quantity}</p>
                  </div>
                  {line.allocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="grid gap-3 rounded-lg border border-outline_variant/20 bg-surface_container_lowest p-3 md:grid-cols-[2fr_1fr_1fr]"
                    >
                      <div className="text-sm text-on_surface">
                        {allocation.lotCode} · exp {allocation.expiryDate}
                      </div>
                      <div className="text-sm text-on_surface_variant">
                        Shipped: {allocation.quantityShipped}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={receivedQuantities[allocation.id] ?? allocation.quantityShipped}
                        onChange={(e) =>
                          setReceivedQuantities((prev) => ({
                            ...prev,
                            [allocation.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleReceive} disabled={loading}>
                Confirm receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
