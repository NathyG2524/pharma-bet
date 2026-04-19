"use client";

import { purchaseOrdersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { PurchaseOrderListItemDto } from "@drug-store/shared";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusBadge = (status: PurchaseOrderListItemDto["status"]) => {
  switch (status) {
    case "APPROVED":
      return <Badge variant="success">Approved</Badge>;
    case "RECEIVED":
      return <Badge variant="default">Received</Badge>;
    default:
      return <Badge variant="warning">Draft</Badge>;
  }
};

export default function PurchaseOrdersPage() {
  const { state } = useAuthContext();
  const [items, setItems] = useState<PurchaseOrderListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isBranchUser = state.roles.some((role) => ["branch_manager", "branch_user"].includes(role));

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await purchaseOrdersApi.listPurchaseOrders();
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purchase orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          {isBranchUser
            ? "Track approved orders awaiting receipt."
            : "Review branch purchase orders."}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Open orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading purchase orders…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">No purchase orders found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
              <table className="w-full text-left text-sm text-on_surface_variant">
                <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                  <tr>
                    <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                      PO
                    </th>
                    <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                      Branch
                    </th>
                    <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                      Lines
                    </th>
                    <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                      Status
                    </th>
                    <th className="px-4 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((po) => (
                    <tr key={po.id} className="transition-colors hover:bg-surface_container_high">
                      <td className="px-4 py-4 text-on_surface">
                        {po.orderNumber ?? po.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-4 text-on_surface_variant">{po.branchName}</td>
                      <td className="px-4 py-4 text-on_surface_variant">{po.lineCount}</td>
                      <td className="px-4 py-4">{statusBadge(po.status)}</td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/purchasing/${po.id}`}
                          className="text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
