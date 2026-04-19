"use client";

import { purchaseOrdersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { parseLocalDateTime } from "@/lib/validation";
import type { PurchaseOrderDto, ReceivePurchaseOrderLineInput } from "@drug-store/shared";
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
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type LineInputs = Record<
  string,
  {
    lotCode: string;
    expiryDate: string;
    quantity: number;
    unitCost: string;
    expiryOverrideReason: string;
  }
>;

const toLocalDatetimeValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const buildReceiptKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rcpt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const statusBadge = (status: PurchaseOrderDto["status"]) => {
  switch (status) {
    case "APPROVED":
      return <Badge variant="success">Approved</Badge>;
    case "RECEIVED":
      return <Badge variant="default">Received</Badge>;
    default:
      return <Badge variant="warning">Draft</Badge>;
  }
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { state } = useAuthContext();
  const isBranchUser = state.roles.some((role) => ["branch_manager", "branch_user"].includes(role));

  const [po, setPo] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [receiptKey, setReceiptKey] = useState(buildReceiptKey);
  const [receivedAt, setReceivedAt] = useState(() => toLocalDatetimeValue(new Date()));
  const [lineInputs, setLineInputs] = useState<LineInputs>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const remainingByLine = useMemo(() => {
    if (!po) return new Map<string, number>();
    return new Map(
      po.lines.map((line) => [line.id, Math.max(0, line.orderedQuantity - line.receivedQuantity)]),
    );
  }, [po]);

  const loadPo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await purchaseOrdersApi.getPurchaseOrder(id);
      setPo(data);
      setLineInputs((prev) =>
        data.lines.reduce<LineInputs>((acc, line) => {
          acc[line.id] = prev[line.id] ?? {
            lotCode: "",
            expiryDate: "",
            quantity: 0,
            unitCost: line.unitCost ?? "",
            expiryOverrideReason: "",
          };
          return acc;
        }, {}),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase order");
      setPo(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPo();
  }, [loadPo]);

  const handleApprove = async () => {
    if (!po) return;
    setError(null);
    try {
      const updated = await purchaseOrdersApi.approvePurchaseOrder(po.id);
      setPo(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const updateLineInput = (lineId: string, patch: Partial<LineInputs[string]>) => {
    setLineInputs((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!po) return;
    setFormError(null);
    setSuccess(null);
    const iso = parseLocalDateTime(receivedAt);
    if (!iso) {
      setFormError("Enter a valid receipt date.");
      return;
    }
    const receiptLines: ReceivePurchaseOrderLineInput[] = [];
    for (const line of po.lines) {
      const input = lineInputs[line.id];
      if (!input || input.quantity <= 0) continue;
      receiptLines.push({
        purchaseOrderLineId: line.id,
        lotCode: input.lotCode.trim(),
        expiryDate: input.expiryDate,
        quantity: input.quantity,
        unitCost: input.unitCost.trim(),
        expiryOverrideReason: input.expiryOverrideReason.trim() || undefined,
      });
    }

    if (!receiptLines.length) {
      setFormError("Enter at least one received quantity.");
      return;
    }
    for (const line of receiptLines) {
      if (!line?.lotCode || !line.expiryDate || !line.unitCost) {
        setFormError("Lot code, expiry date, and unit cost are required.");
        return;
      }
      const remaining = remainingByLine.get(line.purchaseOrderLineId) ?? 0;
      if (line.quantity > remaining) {
        setFormError("Received quantity cannot exceed remaining.");
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (line.expiryDate < today && !line.expiryOverrideReason) {
        setFormError("Expired lots require an override reason.");
        return;
      }
    }

    setReceiving(true);
    try {
      await purchaseOrdersApi.receivePurchaseOrder(po.id, {
        receiptKey,
        receivedAt: iso,
        lines: receiptLines,
      });
      setSuccess("Receipt saved.");
      setReceiptKey(buildReceiptKey());
      setLineInputs((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([lineId, input]) => [
            lineId,
            { ...input, quantity: 0, lotCode: "", expiryDate: "", expiryOverrideReason: "" },
          ]),
        ),
      );
      await loadPo();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to receive");
    } finally {
      setReceiving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-600">Loading…</p>;
  }

  if (!po || error) {
    return (
      <div className="max-w-4xl">
        <Alert variant="destructive">{error ?? "Not found"}</Alert>
        <Link href="/purchasing" className="mt-4 inline-block text-blue-600">
          ← Back to purchase orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/purchasing"
            className="mb-2 inline-block text-sm text-blue-600 hover:underline"
          >
            ← Purchase orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            PO {po.orderNumber ?? po.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Branch: {po.branchName} · Lines: {po.lines.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statusBadge(po.status)}
          {isBranchUser && po.status === "DRAFT" && (
            <Button type="button" size="sm" onClick={() => void handleApprove()}>
              Approve
            </Button>
          )}
        </div>
      </div>

      {isBranchUser && po.status === "APPROVED" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Receive lots</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReceive} className="space-y-4">
              <div>
                <label
                  htmlFor="received-at"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Received at
                </label>
                <Input
                  id="received-at"
                  type="datetime-local"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                  disabled={receiving}
                />
              </div>
              <div className="space-y-4">
                {po.lines.map((line) => {
                  const remaining = remainingByLine.get(line.id) ?? 0;
                  const input = lineInputs[line.id];
                  const qtyId = `qty-${line.id}`;
                  const costId = `unit-cost-${line.id}`;
                  const lotId = `lot-${line.id}`;
                  const expiryId = `expiry-${line.id}`;
                  const overrideId = `override-${line.id}`;
                  return (
                    <div key={line.id} className="rounded-lg border border-outline_variant/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-on_surface">{line.medicineName}</p>
                          <p className="text-xs text-on_surface_variant">
                            Ordered {line.orderedQuantity} · Remaining {remaining}
                          </p>
                        </div>
                        <span className="text-xs text-on_surface_variant">
                          Line {line.id.slice(0, 6)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-5">
                        <div className="md:col-span-1">
                          <label
                            htmlFor={qtyId}
                            className="mb-1 block text-xs font-medium text-on_surface_variant"
                          >
                            Qty
                          </label>
                          <Input
                            id={qtyId}
                            type="number"
                            min={0}
                            max={remaining}
                            value={input?.quantity ?? 0}
                            onChange={(e) =>
                              updateLineInput(line.id, {
                                quantity: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            disabled={receiving}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label
                            htmlFor={costId}
                            className="mb-1 block text-xs font-medium text-on_surface_variant"
                          >
                            Unit cost
                          </label>
                          <Input
                            id={costId}
                            value={input?.unitCost ?? ""}
                            onChange={(e) => updateLineInput(line.id, { unitCost: e.target.value })}
                            disabled={receiving}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label
                            htmlFor={lotId}
                            className="mb-1 block text-xs font-medium text-on_surface_variant"
                          >
                            Lot code
                          </label>
                          <Input
                            id={lotId}
                            value={input?.lotCode ?? ""}
                            onChange={(e) => updateLineInput(line.id, { lotCode: e.target.value })}
                            disabled={receiving}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label
                            htmlFor={expiryId}
                            className="mb-1 block text-xs font-medium text-on_surface_variant"
                          >
                            Expiry
                          </label>
                          <Input
                            id={expiryId}
                            type="date"
                            value={input?.expiryDate ?? ""}
                            onChange={(e) =>
                              updateLineInput(line.id, { expiryDate: e.target.value })
                            }
                            disabled={receiving}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label
                            htmlFor={overrideId}
                            className="mb-1 block text-xs font-medium text-on_surface_variant"
                          >
                            Override reason
                          </label>
                          <Textarea
                            id={overrideId}
                            value={input?.expiryOverrideReason ?? ""}
                            onChange={(e) =>
                              updateLineInput(line.id, { expiryOverrideReason: e.target.value })
                            }
                            disabled={receiving}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {formError && <Alert variant="destructive">{formError}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              <Button type="submit" disabled={receiving}>
                {receiving ? "Receiving…" : "Post receipt"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
            <table className="w-full text-left text-sm text-on_surface_variant">
              <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                <tr>
                  <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Medicine
                  </th>
                  <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Ordered
                  </th>
                  <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Received
                  </th>
                  <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Unit cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((line) => (
                  <tr key={line.id} className="transition-colors hover:bg-surface_container_high">
                    <td className="px-4 py-4 text-on_surface">{line.medicineName}</td>
                    <td className="px-4 py-4 text-on_surface_variant">{line.orderedQuantity}</td>
                    <td className="px-4 py-4 text-on_surface_variant">{line.receivedQuantity}</td>
                    <td className="px-4 py-4 text-on_surface_variant">{line.unitCost ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {po.receipts.length === 0 ? (
            <p className="text-sm text-gray-500">No receipts yet.</p>
          ) : (
            <div className="space-y-4">
              {po.receipts.map((receipt) => (
                <div key={receipt.id} className="rounded-lg border border-outline_variant/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-on_surface">
                      Receipt {receipt.receiptKey}
                    </p>
                    <span className="text-xs text-on_surface_variant">
                      {new Date(receipt.receivedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-lg bg-surface_container_lowest">
                    <table className="w-full text-left text-sm text-on_surface_variant">
                      <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                        <tr>
                          <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                            Lot
                          </th>
                          <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                            Expiry
                          </th>
                          <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                            Unit cost
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipt.lines.map((line) => (
                          <tr
                            key={line.id}
                            className="transition-colors hover:bg-surface_container_high"
                          >
                            <td className="px-4 py-3 text-on_surface">{line.lotCode}</td>
                            <td className="px-4 py-3 text-on_surface_variant">{line.expiryDate}</td>
                            <td className="px-4 py-3 text-on_surface_variant">{line.quantity}</td>
                            <td className="px-4 py-3 text-on_surface_variant">{line.unitCost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
