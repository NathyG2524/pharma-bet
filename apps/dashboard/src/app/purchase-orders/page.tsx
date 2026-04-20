"use client";

import { purchaseOrdersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { PurchaseOrderDto, PurchaseOrderStatus } from "@drug-store/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
} from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const statusLabels: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  received: "Received",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

const statusVariants: Record<
  PurchaseOrderStatus,
  "default" | "success" | "warning" | "destructive"
> = {
  draft: "default",
  pending_approval: "warning",
  approved: "success",
  received: "default",
  rejected: "destructive",
  changes_requested: "warning",
};

export default function PurchaseOrdersPage() {
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [items, setItems] = useState<PurchaseOrderDto[]>([]);
  const [status, setStatus] = useState<PurchaseOrderStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredLabel = useMemo(
    () => (status ? statusLabels[status as PurchaseOrderStatus] : "All"),
    [status],
  );

  const load = useCallback(async () => {
    if (!isHqUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await purchaseOrdersApi.listPurchaseOrders({
        status: status || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isHqUser, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track HQ purchase orders and their approval status.
          </p>
        </div>
        {isHqUser && (
          <Link href="/purchase-orders/new">
            <Button type="button">New purchase order</Button>
          </Link>
        )}
      </div>

      {!isHqUser && (
        <Alert variant="destructive">
          Only HQ users can manage purchase orders. Switch to an HQ role or use the approvals inbox.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px]">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | "")}
              disabled={!isHqUser}
            >
              <option value="">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <span className="text-xs text-on_surface_variant">
            {loading ? "Loading…" : `${items.length} order(s) · ${filteredLabel}`}
          </span>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
        <table className="w-full text-left text-sm text-on_surface_variant">
          <thead className="sticky top-0 z-10 bg-surface_container_lowest">
            <tr>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                PO ID
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Supplier
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Branch
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
                <td colSpan={5} className="px-4 py-8 text-center text-on_surface_variant">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              items.map((po) => (
                <tr key={po.id} className="transition-colors hover:bg-surface_container_high">
                  <td className="px-4 py-4 font-medium text-on_surface">
                    {po.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">{po.supplier?.name ?? "—"}</td>
                  <td className="px-4 py-4">{po.branch?.name ?? "—"}</td>
                  <td className="px-4 py-4 text-on_surface">
                    <Badge variant={statusVariants[po.status]}>{statusLabels[po.status]}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/purchase-orders/${po.id}`}
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
