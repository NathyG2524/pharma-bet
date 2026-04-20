"use client";

import { notificationsApi, purchaseOrdersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { NotificationDto, PurchaseOrderDto } from "@drug-store/shared";
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function PurchaseOrderApprovalsPage() {
  const { state } = useAuthContext();
  const isBranchUser = state.roles.some((role) => ["branch_manager", "branch_user"].includes(role));
  const [items, setItems] = useState<PurchaseOrderDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isBranchUser) return;
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, notificationsRes] = await Promise.all([
        purchaseOrdersApi.listPurchaseOrderInbox(),
        notificationsApi.listNotifications(),
      ]);
      setItems(ordersRes.items);
      setNotifications(notificationsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
      setItems([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isBranchUser]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PO approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review HQ purchase orders awaiting branch approval.
        </p>
      </div>

      {!isBranchUser && (
        <Alert variant="destructive">
          Only branch users can approve purchase orders. Switch to a branch role to continue.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No approval notifications yet.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((note) => (
                <li
                  key={note.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline_variant/20 bg-surface_container_lowest px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-on_surface">{note.title}</p>
                    <p className="text-xs text-on_surface_variant">{note.body}</p>
                  </div>
                  <span className="text-xs text-on_surface_variant">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
                Status
              </th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-on_surface_variant">
                  No purchase orders awaiting approval.
                </td>
              </tr>
            ) : (
              items.map((po) => (
                <tr key={po.id} className="transition-colors hover:bg-surface_container_high">
                  <td className="px-4 py-4 font-medium text-on_surface">
                    {po.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">{po.supplier?.name ?? "—"}</td>
                  <td className="px-4 py-4">
                    <Badge variant="warning">Pending approval</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="font-medium text-primary hover:text-primary_container hover:underline"
                    >
                      Review
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
