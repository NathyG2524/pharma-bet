"use client";

import { medicinesApi } from "@/lib/api";
import type { MedicineDto, MedicineTransactionDto } from "@drug-store/shared";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
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

export default function MedicineDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [medicine, setMedicine] = useState<MedicineDto | null>(null);
  const [transactions, setTransactions] = useState<MedicineTransactionDto[]>([]);
  const [totalTx, setTotalTx] = useState(0);
  const pageSize = 30;
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMedicine = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const m = await medicinesApi.getMedicine(id);
      setMedicine(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not found");
      setMedicine(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadMedicine();
  }, [loadMedicine]);

  useEffect(() => {
    if (!id || !medicine) return;
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
  }, [id, medicine]);

  const loadMore = async () => {
    if (!id || txLoading || transactions.length >= totalTx) return;
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

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div className="max-w-4xl">
        <Alert variant="destructive">{error}</Alert>
        <Link href="/inventory" className="mt-4 inline-block text-blue-600">
          ← Back to medicines
        </Link>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">{medicine.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            SKU: {medicine.sku ?? "—"} · Unit: {medicine.unit ?? "—"} · Stock:{" "}
            <span className="font-semibold text-gray-900">{medicine.stockQuantity}</span>
            {!medicine.isActive && (
              <Badge className="ml-2" variant="warning">
                Inactive
              </Badge>
            )}
          </p>
        </div>
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
      </div>

      <Card className="mb-6">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">SKU</p>
            <p className="mt-1 font-medium text-gray-900">{medicine.sku ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Unit</p>
            <p className="mt-1 font-medium text-gray-900">{medicine.unit ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Stock</p>
            <p className="mt-1 font-medium text-gray-900">{medicine.stockQuantity}</p>
          </div>
        </CardContent>
      </Card>

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
                      <tr key={t.id} className="transition-colors hover:bg-surface_container_high">
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
    </div>
  );
}
