"use client";

import { stockCountsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { StockCountSessionDto, StockCountSessionStatus } from "@drug-store/shared";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const statusLabels: Record<StockCountSessionStatus, string> = {
  open: "Open",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  posted: "Posted",
};

const statusVariants: Record<
  StockCountSessionStatus,
  "default" | "success" | "warning" | "destructive"
> = {
  open: "default",
  submitted: "warning",
  approved: "success",
  rejected: "destructive",
  posted: "success",
};

export default function StockCountsPage() {
  const { state } = useAuthContext();
  const canView = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [items, setItems] = useState<StockCountSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await stockCountsApi.listSessions();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock count sessions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    load();
  }, [load]);

  const totalLabel = useMemo(
    () => (loading ? "Loading…" : `${items.length} session(s)`),
    [loading, items.length],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock count sessions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Stock count sessions with variance proposals requiring dual approval before posting.
          </p>
        </div>
        {canView && (
          <Link href="/stock-counts/new">
            <Button type="button">New session</Button>
          </Link>
        )}
      </div>

      {!canView && (
        <Alert variant="destructive">
          You need branch access to view stock count sessions.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Sessions overview</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-on_surface_variant">{totalLabel}</CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
        <table className="w-full text-left text-sm text-on_surface_variant">
          <thead className="sticky top-0 z-10 bg-surface_container_lowest">
            <tr>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Session
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Opened by
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Created
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
                  No sessions yet.
                </td>
              </tr>
            ) : (
              items.map((session) => (
                <tr key={session.id} className="transition-colors hover:bg-surface_container_high">
                  <td className="px-4 py-4 font-medium text-on_surface">
                    {session.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">{session.openedByUserId}</td>
                  <td className="px-4 py-4">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={statusVariants[session.status]}>
                      {statusLabels[session.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/stock-counts/${session.id}`}
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
