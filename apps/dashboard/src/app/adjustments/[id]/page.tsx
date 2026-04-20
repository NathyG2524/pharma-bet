"use client";

import { adjustmentsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { AdjustmentStatus, InventoryAdjustmentDto } from "@drug-store/shared";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export default function AdjustmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state } = useAuthContext();
  const canPost = state.roles.some((role) =>
    ["branch_manager", "hq_admin", "platform_admin"].includes(role),
  );

  const [adj, setAdj] = useState<InventoryAdjustmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adjustmentsApi.getAdjustment(id);
      setAdj(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load adjustment");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await adjustmentsApi.submitForApproval(id, {});
      setAdj(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit for approval");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await adjustmentsApi.syncApprovalStatus(id);
      setAdj(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync approval status");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await adjustmentsApi.postAdjustment(id);
      setAdj(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post adjustment");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (!adj) {
    return <Alert variant="destructive">{error ?? "Adjustment not found"}</Alert>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Adjustment {adj.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dual approval required before posting to inventory ledger.
          </p>
        </div>
        <Badge variant={statusVariants[adj.status]}>{statusLabels[adj.status]}</Badge>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="font-medium text-gray-600">Lot ID</dt>
            <dd className="text-gray-900">{adj.lotId.slice(0, 8).toUpperCase()}</dd>

            <dt className="font-medium text-gray-600">Medicine ID</dt>
            <dd className="text-gray-900">{adj.medicineId.slice(0, 8).toUpperCase()}</dd>

            <dt className="font-medium text-gray-600">Quantity</dt>
            <dd className={`font-semibold ${adj.quantity < 0 ? "text-red-600" : "text-green-600"}`}>
              {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
            </dd>

            <dt className="font-medium text-gray-600">Reason</dt>
            <dd className="text-gray-900">{adj.reasonCode.replace(/_/g, " ")}</dd>

            {adj.notes && (
              <>
                <dt className="font-medium text-gray-600">Notes</dt>
                <dd className="text-gray-900">{adj.notes}</dd>
              </>
            )}

            <dt className="font-medium text-gray-600">Requested by</dt>
            <dd className="text-gray-900">{adj.requestedByUserId}</dd>

            {adj.approvalInstanceId && (
              <>
                <dt className="font-medium text-gray-600">Approval</dt>
                <dd className="text-gray-900">
                  <Link
                    href={`/approvals?domainType=adjustment&domainId=${adj.id}`}
                    className="text-primary underline hover:text-primary_container"
                  >
                    View approval
                  </Link>
                </dd>
              </>
            )}

            {adj.postedAt && (
              <>
                <dt className="font-medium text-gray-600">Posted at</dt>
                <dd className="text-gray-900">{new Date(adj.postedAt).toLocaleString()}</dd>

                <dt className="font-medium text-gray-600">Posted by</dt>
                <dd className="text-gray-900">{adj.postedByUserId}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {adj.status === "draft" && (
          <Button
            type="button"
            onClick={handleSubmitForApproval}
            disabled={actionLoading}
          >
            Submit for approval
          </Button>
        )}
        {(adj.status === "pending_approval" || adj.status === "approved") && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncApproval}
            disabled={actionLoading}
          >
            Sync approval status
          </Button>
        )}
        {adj.status === "approved" && canPost && (
          <Button
            type="button"
            onClick={handlePost}
            disabled={actionLoading}
          >
            Post to ledger
          </Button>
        )}
        <Link href="/adjustments">
          <Button type="button" variant="outline">
            Back to list
          </Button>
        </Link>
      </div>
    </div>
  );
}
