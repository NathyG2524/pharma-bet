"use client";

import { inventoryApi, medicinesApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { InventoryLotStatus } from "@drug-store/shared";
import type {
  CanonicalMedicineDto,
  InventoryLotDto,
  InventoryLotStatusType,
  MedicineDto,
  MedicineTransactionDto,
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
  Select,
} from "@drug-store/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatRate(rate: string | null) {
  if (!rate) return "—";
  const parsed = Number.parseFloat(rate);
  if (!Number.isFinite(parsed)) return rate;
  return `${(parsed * 100).toFixed(2)}%`;
}

export default function MedicineDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const isBranchUser = state.roles.some((role) => ["branch_manager", "branch_user"].includes(role));
  const canViewLots = isBranchUser || isHqUser;

  const [medicine, setMedicine] = useState<MedicineDto | null>(null);
  const [catalogItem, setCatalogItem] = useState<CanonicalMedicineDto | null>(null);
  const [transactions, setTransactions] = useState<MedicineTransactionDto[]>([]);
  const [totalTx, setTotalTx] = useState(0);
  const [lots, setLots] = useState<InventoryLotDto[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotStatusError, setLotStatusError] = useState<string | null>(null);
  const [lotStatusUpdating, setLotStatusUpdating] = useState<Record<string, boolean>>({});
  const pageSize = 30;
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const medicineId = medicine?.id;
  const canonical = medicine ?? catalogItem;
  const [catalogName, setCatalogName] = useState("");
  const [catalogSku, setCatalogSku] = useState("");
  const [catalogUnit, setCatalogUnit] = useState("");
  const [catalogActive, setCatalogActive] = useState("true");
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSuccess, setCatalogSuccess] = useState<string | null>(null);
  const [overlayReorderMin, setOverlayReorderMin] = useState("");
  const [overlayReorderMax, setOverlayReorderMax] = useState("");
  const [overlayBin, setOverlayBin] = useState("");
  const [overlayPrice, setOverlayPrice] = useState("");
  const [overlayCost, setOverlayCost] = useState("");
  const [overlaySaving, setOverlaySaving] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [overlaySuccess, setOverlaySuccess] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  const loadMedicine = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      if (isBranchUser) {
        const m = await medicinesApi.getMedicine(id);
        setMedicine(m);
        setCatalogItem(null);
      } else if (isHqUser) {
        const m = await medicinesApi.getCanonicalMedicine(id);
        setCatalogItem(m);
        setMedicine(null);
      } else {
        throw new Error("No access to this catalog item.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not found");
      setMedicine(null);
      setCatalogItem(null);
    } finally {
      setLoading(false);
    }
  }, [id, isBranchUser, isHqUser]);

  useEffect(() => {
    void loadMedicine();
  }, [loadMedicine]);

  useEffect(() => {
    if (!id || !medicineId || !isBranchUser) return;
    void (async () => {
      setTxLoading(true);
      try {
        const res = await medicinesApi.getMedicineTransactions(id, {
          limit: pageSize,
          offset: 0,
        });
        setTransactions(res.items);
        setTotalTx(res.total);
      } catch {
        setTransactions([]);
      } finally {
        setTxLoading(false);
      }
    })();
  }, [id, medicineId, isBranchUser]);

  useEffect(() => {
    if (!id || !medicineId || !canViewLots) return;
    void (async () => {
      setLotsLoading(true);
      try {
        const res = await inventoryApi.listLots({ medicineId: id });
        setLots(res.items);
      } catch {
        setLots([]);
      } finally {
        setLotsLoading(false);
      }
    })();
  }, [id, medicineId, canViewLots]);

  useEffect(() => {
    if (!canonical) return;
    setCatalogName(canonical.name);
    setCatalogSku(canonical.sku ?? "");
    setCatalogUnit(canonical.unit ?? "");
    setCatalogActive(canonical.isActive ? "true" : "false");
  }, [canonical]);

  useEffect(() => {
    if (!medicine) return;
    setOverlayReorderMin(medicine.reorderMin != null ? String(medicine.reorderMin) : "");
    setOverlayReorderMax(medicine.reorderMax != null ? String(medicine.reorderMax) : "");
    setOverlayBin(medicine.binLocation ?? "");
    setOverlayPrice(medicine.localPrice ?? "");
    setOverlayCost(medicine.localCost ?? "");
  }, [medicine]);

  const loadMore = async () => {
    if (!id || txLoading || transactions.length >= totalTx || !isBranchUser) return;
    setTxLoading(true);
    try {
      const res = await medicinesApi.getMedicineTransactions(id, {
        limit: pageSize,
        offset: transactions.length,
      });
      setTransactions((prev) => [...prev, ...res.items]);
    } finally {
      setTxLoading(false);
    }
  };

  const handleLotStatusChange = async (lot: InventoryLotDto, status: InventoryLotStatusType) => {
    if (!isHqUser) return;
    if (status === InventoryLotStatus.RECALLED && lot.status !== InventoryLotStatus.RECALLED) {
      const confirmed = window.confirm(
        "Recall is permanent and blocks all outbound allocations. Continue?",
      );
      if (!confirmed) return;
    }
    setLotStatusError(null);
    setLotStatusUpdating((prev) => ({ ...prev, [lot.id]: true }));
    try {
      const updated = await inventoryApi.updateLotStatus(lot.id, { status });
      setLots((prev) => prev.map((lot) => (lot.id === updated.id ? updated : lot)));
    } catch {
      setLotStatusError("Unable to update lot status. Please try again.");
    } finally {
      setLotStatusUpdating((prev) => ({ ...prev, [lot.id]: false }));
    }
  };

  const isLotStatusLocked = (lot: InventoryLotDto) => lot.status === InventoryLotStatus.RECALLED;

  const getLotStatusLabel = (lot: InventoryLotDto) => {
    if (lot.status === InventoryLotStatus.RECALLED) return "Recalled";
    if (lot.status === InventoryLotStatus.QUARANTINE) return "Quarantined";
    if (lot.isExpired) return "Expired";
    return "Active";
  };

  const getLotStatusVariant = (lot: InventoryLotDto) => {
    if (lot.status === InventoryLotStatus.RECALLED) return "destructive";
    if (lot.status === InventoryLotStatus.QUARANTINE) return "warning";
    if (lot.isExpired) return "warning";
    return "success";
  };

  const handlePromote = async () => {
    if (!canonical || !isHqUser) return;
    setPromoteError(null);
    setPromoteSuccess(null);
    setPromoting(true);
    try {
      const updated = await medicinesApi.promoteDraftMedicine(canonical.id);
      setCatalogItem(updated);
      setMedicine(null);
      setPromoteSuccess(`"${updated.name}" has been promoted to the canonical catalog.`);
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : "Failed to promote");
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (error || !canonical) {
    return (
      <div className="max-w-4xl">
        <Alert variant="destructive">{error}</Alert>
        <Link href="/inventory" className="mt-4 inline-block text-blue-600">
          ← Back to medicines
        </Link>
      </div>
    );
  }

  const isDraft = canonical.status === "draft";

  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canonical || !isHqUser) return;
    setCatalogError(null);
    setCatalogSuccess(null);
    setCatalogSaving(true);
    try {
      const updated = await medicinesApi.updateMedicine(canonical.id, {
        name: catalogName.trim(),
        sku: catalogSku.trim() || null,
        unit: catalogUnit.trim() || null,
        isActive: catalogActive === "true",
      });
      setCatalogItem(updated);
      setMedicine((prev) => (prev ? { ...prev, ...updated, isActive: updated.isActive } : prev));
      setCatalogSuccess("Canonical product updated.");
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleOverlaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || !isBranchUser) return;
    setOverlayError(null);
    setOverlaySuccess(null);
    const reorderMin =
      overlayReorderMin.trim() === "" ? null : Number.parseInt(overlayReorderMin, 10);
    const reorderMax =
      overlayReorderMax.trim() === "" ? null : Number.parseInt(overlayReorderMax, 10);
    if (
      (reorderMin != null && (Number.isNaN(reorderMin) || reorderMin < 0)) ||
      (reorderMax != null && (Number.isNaN(reorderMax) || reorderMax < 0))
    ) {
      setOverlayError("Reorder min/max must be valid non-negative integers.");
      return;
    }
    setOverlaySaving(true);
    try {
      const updated = await medicinesApi.updateMedicineOverlay(medicine.id, {
        reorderMin,
        reorderMax,
        binLocation: overlayBin.trim() || null,
        localPrice: overlayPrice.trim() || null,
        localCost: overlayCost.trim() || null,
      });
      setMedicine(updated);
      setOverlaySuccess("Overlay saved.");
    } catch (err) {
      setOverlayError(err instanceof Error ? err.message : "Failed to update overlay");
    } finally {
      setOverlaySaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/inventory"
            className="mb-2 inline-block text-sm text-blue-600 hover:underline"
          >
            ← Medicines
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{canonical?.name ?? "Medicine"}</h1>
            {isDraft && <Badge variant="warning">Draft</Badge>}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            SKU: {canonical?.sku ?? "—"} · Unit: {canonical?.unit ?? "—"}
            {isBranchUser && (
              <>
                {" "}
                · Stock:{" "}
                <span className="font-semibold text-gray-900">{medicine?.stockQuantity ?? 0}</span>
              </>
            )}
            {canonical && !canonical.isActive && (
              <Badge className="ml-2" variant="warning">
                Inactive
              </Badge>
            )}
          </p>
        </div>
        {isBranchUser && (
          <div className="flex gap-2">
            <Link href="/inventory/buy">
              <Button type="button" size="sm">
                Buy
              </Button>
            </Link>
            <Link href="/inventory/sell">
              <Button type="button" size="sm" variant="outline">
                Sell
              </Button>
            </Link>
          </div>
        )}
      </div>

      {isDraft && (
        <Alert variant="warning" className="mb-6">
          <strong>Draft product</strong> — this medicine is a branch-local draft and is not yet in
          the canonical catalog. It cannot be referenced on HQ purchase orders until promoted.
          {isHqUser && (
            <div className="mt-3">
              {promoteError && (
                <Alert variant="destructive" className="mb-2">
                  {promoteError}
                </Alert>
              )}
              {promoteSuccess && (
                <Alert variant="success" className="mb-2">
                  {promoteSuccess}
                </Alert>
              )}
              {!promoteSuccess && (
                <Button
                  type="button"
                  size="sm"
                  disabled={promoting}
                  onClick={() => void handlePromote()}
                >
                  {promoting ? "Promoting…" : "Promote to canonical"}
                </Button>
              )}
            </div>
          )}
        </Alert>
      )}

      <Card className="mb-6">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">SKU</p>
            <p className="mt-1 font-medium text-gray-900">{canonical?.sku ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Unit</p>
            <p className="mt-1 font-medium text-gray-900">{canonical?.unit ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Stock</p>
            <p className="mt-1 font-medium text-gray-900">
              {isBranchUser ? (medicine?.stockQuantity ?? 0) : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {isHqUser && canonical && !isDraft && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Canonical product</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCatalogSubmit} className="space-y-4">
              <div>
                <label htmlFor="catalog-name" className="mb-1.5 block text-sm font-medium">
                  Name
                </label>
                <Input
                  id="catalog-name"
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  disabled={catalogSaving}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="catalog-sku" className="mb-1.5 block text-sm font-medium">
                    SKU
                  </label>
                  <Input
                    id="catalog-sku"
                    value={catalogSku}
                    onChange={(e) => setCatalogSku(e.target.value)}
                    disabled={catalogSaving}
                  />
                </div>
                <div>
                  <label htmlFor="catalog-unit" className="mb-1.5 block text-sm font-medium">
                    Unit
                  </label>
                  <Input
                    id="catalog-unit"
                    value={catalogUnit}
                    onChange={(e) => setCatalogUnit(e.target.value)}
                    disabled={catalogSaving}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="catalog-active" className="mb-1.5 block text-sm font-medium">
                  Status
                </label>
                <Select
                  id="catalog-active"
                  value={catalogActive}
                  onChange={(e) => setCatalogActive(e.target.value)}
                  disabled={catalogSaving}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>
              {catalogError && <Alert variant="destructive">{catalogError}</Alert>}
              {catalogSuccess && <Alert variant="success">{catalogSuccess}</Alert>}
              <Button type="submit" disabled={catalogSaving}>
                {catalogSaving ? "Saving…" : "Save canonical"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isBranchUser && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Branch overlay</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOverlaySubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="overlay-min" className="mb-1.5 block text-sm font-medium">
                    Reorder min
                  </label>
                  <Input
                    id="overlay-min"
                    type="number"
                    min={0}
                    value={overlayReorderMin}
                    onChange={(e) => setOverlayReorderMin(e.target.value)}
                    disabled={overlaySaving}
                  />
                </div>
                <div>
                  <label htmlFor="overlay-max" className="mb-1.5 block text-sm font-medium">
                    Reorder max
                  </label>
                  <Input
                    id="overlay-max"
                    type="number"
                    min={0}
                    value={overlayReorderMax}
                    onChange={(e) => setOverlayReorderMax(e.target.value)}
                    disabled={overlaySaving}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="overlay-bin" className="mb-1.5 block text-sm font-medium">
                  Bin location
                </label>
                <Input
                  id="overlay-bin"
                  value={overlayBin}
                  onChange={(e) => setOverlayBin(e.target.value)}
                  disabled={overlaySaving}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="overlay-price" className="mb-1.5 block text-sm font-medium">
                    Local price
                  </label>
                  <Input
                    id="overlay-price"
                    inputMode="decimal"
                    value={overlayPrice}
                    onChange={(e) => setOverlayPrice(e.target.value)}
                    disabled={overlaySaving}
                  />
                </div>
                <div>
                  <label htmlFor="overlay-cost" className="mb-1.5 block text-sm font-medium">
                    Local cost
                  </label>
                  <Input
                    id="overlay-cost"
                    inputMode="decimal"
                    value={overlayCost}
                    onChange={(e) => setOverlayCost(e.target.value)}
                    disabled={overlaySaving}
                  />
                </div>
              </div>
              {overlayError && <Alert variant="destructive">{overlayError}</Alert>}
              {overlaySuccess && <Alert variant="success">{overlaySuccess}</Alert>}
              <Button type="submit" disabled={overlaySaving}>
                {overlaySaving ? "Saving…" : "Save overlay"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isBranchUser && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction history</CardTitle>
          </CardHeader>
          <CardContent>
            {txLoading && transactions.length === 0 ? (
              <p className="text-sm text-gray-500">Loading history…</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
                  <table className="w-full text-left text-sm text-on_surface_variant">
                    <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                      <tr>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Type
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Qty
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Unit price
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Tax base
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Tax rate
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Tax amount
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          When
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Patient
                        </th>
                        <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr
                          key={t.id}
                          className="transition-colors hover:bg-surface_container_high"
                        >
                          <td className="px-4 py-4">
                            <span>
                              {t.type === "BUY" ? (
                                <Badge variant="success">{t.type}</Badge>
                              ) : (
                                <Badge variant="default">{t.type}</Badge>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-on_surface">{t.quantity}</td>
                          <td className="px-4 py-4">{t.unitPrice ?? "—"}</td>
                          <td className="px-4 py-4">{t.taxBase ?? "—"}</td>
                          <td className="px-4 py-4">{formatRate(t.taxRate)}</td>
                          <td className="px-4 py-4">{t.taxAmount ?? "—"}</td>
                          <td className="px-4 py-4 text-on_surface_variant">
                            {formatDt(t.recordedAt)}
                          </td>
                          <td className="px-4 py-4 text-on_surface_variant">
                            {t.type === "SELL" && t.patient
                              ? `${t.patient.name ?? t.patient.phone} (${t.patient.phone})`
                              : t.type === "SELL"
                                ? "Walk-in"
                                : "—"}
                          </td>
                          <td
                            className="max-w-[180px] truncate px-4 py-4 text-on_surface_variant"
                            title={t.notes ?? undefined}
                          >
                            {t.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactions.length < totalTx && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={txLoading}
                      onClick={() => void loadMore()}
                    >
                      {txLoading ? "Loading…" : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {canViewLots && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Lots on hand</CardTitle>
          </CardHeader>
          <CardContent>
            {lotStatusError && (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                {lotStatusError}
              </Alert>
            )}
            {lotsLoading ? (
              <p className="text-sm text-gray-500">Loading lots…</p>
            ) : lots.length === 0 ? (
              <p className="text-sm text-gray-500">No lots on hand.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
                <table className="w-full text-left text-sm text-on_surface_variant">
                  <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                    <tr>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Lot
                      </th>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Expiry
                      </th>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Qty
                      </th>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Unit cost
                      </th>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => (
                      <tr
                        key={lot.id}
                        className="transition-colors hover:bg-surface_container_high"
                      >
                        <td className="px-4 py-4 text-on_surface">{lot.lotCode}</td>
                        <td className="px-4 py-4 text-on_surface_variant">{lot.expiryDate}</td>
                        <td className="px-4 py-4 text-on_surface">{lot.quantityOnHand}</td>
                        <td className="px-4 py-4 text-on_surface_variant">{lot.unitCost}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <Badge variant={getLotStatusVariant(lot)}>
                              {getLotStatusLabel(lot)}
                            </Badge>
                            {isHqUser && (
                              <>
                                <span className="text-xs font-medium text-on_surface_variant">
                                  Set status
                                </span>
                                <Select
                                  value={lot.status}
                                  onChange={(e) =>
                                    handleLotStatusChange(
                                      lot,
                                      e.target.value as InventoryLotStatusType,
                                    )
                                  }
                                  disabled={lotStatusUpdating[lot.id] || isLotStatusLocked(lot)}
                                  aria-label={`Change status for lot ${lot.lotCode}`}
                                >
                                  <option value="ACTIVE">Active</option>
                                  <option value="QUARANTINE">Quarantine</option>
                                  <option value="RECALLED">Recalled</option>
                                </Select>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
