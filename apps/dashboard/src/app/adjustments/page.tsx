"use client";

import { adjustmentsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { AdjustmentStatus, InventoryAdjustmentDto } from "@drug-store/shared";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const statusLabels: Record<AdjustmentStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  posted: "Posted",
};

const statusVariants: Record<
  AdjustmentStatus,
  "default" | "success" | "warning" | "destructive"
> = {
  draft: "default",
  pending_approval: "warning",
  approved: "success",
  rejected: "destructive",
  posted: "success",
};

export default function AdjustmentsPage() {
  const { state } = useAuthContext();
  const canView = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [items, setItems] = useState<InventoryAdjustmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adjustmentsApi.listAdjustments();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load adjustments");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    load();
  }, [load]);

  const totalLabel = useMemo(
    () => (loading ? "Loading…" : `${items.length} adjustment(s)`),
    [loading, items.length],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory adjustments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Lot-scoped adjustment requests requiring dual approval before posting.
          </p>
        </div>
        {canView && (
          <Link href="/adjustments/new">
            <Button type="button">New adjustment</Button>
          </Link>
        )}
      </div>

      {!canView && (
        <Alert variant="destructive">
          You need branch access to view adjustments.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Adjustments overview</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-on_surface_variant">{totalLabel}</CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
        <table className="w-full text-left text-sm text-on_surface_variant">
          <thead className="sticky top-0 z-10 bg-surface_container_lowest">
            <tr>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                ID
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Lot
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Qty
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Reason
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Status
              </th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on_surface_variant">
                  No adjustments yet.
                </td>
              </tr>
            ) : (
              items.map((adj) => (
                <tr key={adj.id} className="transition-colors hover:bg-surface_container_high">
                  <td className="px-4 py-4 font-medium text-on_surface">
                    {adj.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">{adj.lotId.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-4">
                    <span className={adj.quantity < 0 ? "text-red-600" : "text-green-600"}>
                      {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-4">{adj.reasonCode.replace(/_/g, " ")}</td>
                  <td className="px-4 py-4">
                    <Badge variant={statusVariants[adj.status]}>
                      {statusLabels[adj.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/adjustments/${adj.id}`}
                      className="font-medium text-primary hover:text-primary_container hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
