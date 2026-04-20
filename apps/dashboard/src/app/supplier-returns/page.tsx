"use client";

import { supplierReturnsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { SupplierReturnDto, SupplierReturnStatus } from "@drug-store/shared";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const statusLabels: Record<SupplierReturnStatus, string> = {
  draft: "Draft",
  pending_hq_confirmation: "Pending HQ confirmation",
  hq_confirmed: "HQ confirmed",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  dispatched: "Dispatched",
};

const statusVariants: Record<
  SupplierReturnStatus,
  "default" | "success" | "warning" | "destructive"
> = {
  draft: "default",
  pending_hq_confirmation: "warning",
  hq_confirmed: "warning",
  pending_approval: "warning",
  approved: "success",
  rejected: "destructive",
  dispatched: "success",
};

export default function SupplierReturnsPage() {
  const { state } = useAuthContext();
  const canView = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [items, setItems] = useState<SupplierReturnDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await supplierReturnsApi.listReturns();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplier returns");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    load();
  }, [load]);

  const totalLabel = useMemo(
    () => (loading ? "Loading…" : `${items.length} return(s)`),
    [loading, items.length],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier returns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Lot-scoped returns to suppliers. Requires HQ confirmation and dual approval before
            dispatch.
          </p>
        </div>
        {canView && (
          <Link href="/supplier-returns/new">
            <Button type="button">New return</Button>
          </Link>
        )}
      </div>

      {!canView && (
        <Alert variant="destructive">You need branch access to view supplier returns.</Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Returns overview</CardTitle>
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
                Supplier
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Lines
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Status
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Created
              </th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on_surface_variant">
                  No supplier returns yet.
                </td>
              </tr>
            ) : (
              items.map((ret) => (
                <tr key={ret.id} className="transition-colors hover:bg-surface_container_high">
                  <td className="px-4 py-4 font-medium text-on_surface">
                    {ret.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">{ret.supplierId.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-4">{ret.lines?.length ?? 0}</td>
                  <td className="px-4 py-4">
                    <Badge variant={statusVariants[ret.status]}>{statusLabels[ret.status]}</Badge>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    {new Date(ret.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/supplier-returns/${ret.id}`}
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
