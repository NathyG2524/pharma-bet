"use client";

import { inventoryApi } from "@/lib/api";
import type { InventoryValuationLineDto } from "@drug-store/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import { useEffect, useState } from "react";

export default function InventoryValuationPage() {
  const [lines, setLines] = useState<InventoryValuationLineDto[]>([]);
  const [totalValue, setTotalValue] = useState("0.0000");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await inventoryApi.getValuation();
        setLines(res.lines);
        setTotalValue(res.totalValue);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load valuation");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Branch valuation</h1>
        <p className="mt-1 text-sm text-gray-600">Total value based on lot costs.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>On-hand valuation</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading valuation…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-gray-500">No lot balances available.</p>
          ) : (
            <>
              <div className="mb-4 text-sm text-on_surface_variant">
                Total value: <span className="font-semibold text-on_surface">{totalValue}</span>
              </div>
              <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
                <table className="w-full text-left text-sm text-on_surface_variant">
                  <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                    <tr>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Medicine
                      </th>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Qty
                      </th>
                      <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr
                        key={line.medicineId}
                        className="transition-colors hover:bg-surface_container_high"
                      >
                        <td className="px-4 py-4 text-on_surface">{line.medicineName}</td>
                        <td className="px-4 py-4 text-on_surface_variant">{line.quantityOnHand}</td>
                        <td className="px-4 py-4 text-on_surface_variant">{line.totalValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
