"use client";

import { transfersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { TransferDto, TransferStatus } from "@drug-store/shared";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const statusLabels: Record<TransferStatus, string> = {
  draft: "Draft",
  in_transit: "In transit",
  received: "Received",
  received_with_variance: "Received (variance)",
};

const statusVariants: Record<TransferStatus, "default" | "success" | "warning"> = {
  draft: "default",
  in_transit: "warning",
  received: "success",
  received_with_variance: "warning",
};

export default function TransfersPage() {
  const { state } = useAuthContext();
  const canManageTransfers = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [items, setItems] = useState<TransferDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canManageTransfers) return;
    setLoading(true);
    setError(null);
    try {
      const res = await transfersApi.listTransfers();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canManageTransfers]);

  useEffect(() => {
    load();
  }, [load]);

  const totalLabel = useMemo(
    () => (loading ? "Loading…" : `${items.length} transfer(s)`),
    [loading, items.length],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track inter-branch stock transfers and receipts.
          </p>
        </div>
        {canManageTransfers && (
          <Link href="/transfers/new">
            <Button type="button">New transfer</Button>
          </Link>
        )}
      </div>

      {!canManageTransfers && (
        <Alert variant="destructive">
          You need branch access to view transfers. Update your role or branch assignment to
          continue.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Transfers overview</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-on_surface_variant">{totalLabel}</CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
        <table className="w-full text-left text-sm text-on_surface_variant">
          <thead className="sticky top-0 z-10 bg-surface_container_lowest">
            <tr>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Transfer
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Source
              </th>
              <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                Destination
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
                  No transfers yet.
                </td>
              </tr>
            ) : (
              items.map((transfer) => (
                <tr key={transfer.id} className="transition-colors hover:bg-surface_container_high">
                  <td className="px-4 py-4 font-medium text-on_surface">
                    {transfer.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">{transfer.sourceBranch?.name ?? "—"}</td>
                  <td className="px-4 py-4">{transfer.destinationBranch?.name ?? "—"}</td>
                  <td className="px-4 py-4 text-on_surface">
                    <Badge variant={statusVariants[transfer.status]}>
                      {statusLabels[transfer.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/transfers/${transfer.id}`}
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
