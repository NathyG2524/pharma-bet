"use client";

import { supplierReturnsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { SupplierReturnDto, SupplierReturnStatus } from "@drug-store/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from "@drug-store/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

export default function SupplierReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state } = useAuthContext();
  const isHq = state.roles.some((role) => ["hq_admin", "hq_user", "platform_admin"].includes(role));
  const canDispatch = state.roles.some((role) =>
    ["branch_manager", "hq_admin", "platform_admin"].includes(role),
  );

  const [ret, setRet] = useState<SupplierReturnDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hqNotes, setHqNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supplierReturnsApi.getReturn(id);
      setRet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplier return");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitForHq = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await supplierReturnsApi.submitForHqConfirmation(id);
      setRet(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit for HQ confirmation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleHqConfirm = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await supplierReturnsApi.hqConfirm(id, {
        notes: hqNotes.trim() || undefined,
      });
      setRet(updated);
      setHqNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm return");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await supplierReturnsApi.submitForApproval(id, {});
      setRet(updated);
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
      const updated = await supplierReturnsApi.syncApprovalStatus(id);
      setRet(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync approval status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await supplierReturnsApi.dispatch(id);
      setRet(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispatch return");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (!ret) {
    return <Alert variant="destructive">{error ?? "Supplier return not found"}</Alert>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Return {ret.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Supplier return: HQ confirmation + dual approval required before dispatch.
          </p>
        </div>
        <Badge variant={statusVariants[ret.status]}>{statusLabels[ret.status]}</Badge>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Return details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="font-medium text-gray-600">Supplier ID</dt>
            <dd className="text-gray-900">{ret.supplierId.slice(0, 8).toUpperCase()}</dd>

            {ret.sourcePurchaseOrderId && (
              <>
                <dt className="font-medium text-gray-600">Source PO</dt>
                <dd className="text-gray-900">
                  {ret.sourcePurchaseOrderId.slice(0, 8).toUpperCase()}
                </dd>
              </>
            )}

            {ret.sourceReceiptId && (
              <>
                <dt className="font-medium text-gray-600">Source receipt</dt>
                <dd className="text-gray-900">{ret.sourceReceiptId.slice(0, 8).toUpperCase()}</dd>
              </>
            )}

            {ret.notes && (
              <>
                <dt className="font-medium text-gray-600">Notes</dt>
                <dd className="text-gray-900">{ret.notes}</dd>
              </>
            )}

            <dt className="font-medium text-gray-600">Requested by</dt>
            <dd className="text-gray-900">{ret.requestedByUserId}</dd>

            {ret.hqConfirmedByUserId && (
              <>
                <dt className="font-medium text-gray-600">HQ confirmed by</dt>
                <dd className="text-gray-900">{ret.hqConfirmedByUserId}</dd>

                <dt className="font-medium text-gray-600">HQ confirmed at</dt>
                <dd className="text-gray-900">
                  {ret.hqConfirmedAt ? new Date(ret.hqConfirmedAt).toLocaleString() : "—"}
                </dd>

                {ret.hqConfirmationNotes && (
                  <>
                    <dt className="font-medium text-gray-600">HQ notes</dt>
                    <dd className="text-gray-900">{ret.hqConfirmationNotes}</dd>
                  </>
                )}
              </>
            )}

            {ret.approvalInstanceId && (
              <>
                <dt className="font-medium text-gray-600">Approval</dt>
                <dd className="text-gray-900">
                  <Link
                    href={`/approvals?domainType=supplier_return&domainId=${ret.id}`}
                    className="text-primary underline hover:text-primary_container"
                  >
                    View approval
                  </Link>
                </dd>
              </>
            )}

            {ret.dispatchedAt && (
              <>
                <dt className="font-medium text-gray-600">Dispatched at</dt>
                <dd className="text-gray-900">{new Date(ret.dispatchedAt).toLocaleString()}</dd>

                <dt className="font-medium text-gray-600">Dispatched by</dt>
                <dd className="text-gray-900">{ret.dispatchedByUserId}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {ret.lines && ret.lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Return lines</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 pr-4 font-medium text-gray-600">Lot</th>
                  <th className="pb-2 pr-4 font-medium text-gray-600">Medicine</th>
                  <th className="pb-2 pr-4 font-medium text-gray-600">Qty</th>
                  <th className="pb-2 font-medium text-gray-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {ret.lines.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">
                      {line.lotId.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-2 pr-4 text-gray-900">
                      {line.medicineId.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-2 pr-4 text-red-600 font-semibold">-{line.quantity}</td>
                    <td className="py-2 text-gray-500">{line.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* HQ confirmation form */}
      {ret.status === "pending_hq_confirmation" && isHq && (
        <Card>
          <CardHeader>
            <CardTitle>HQ confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Confirm this return against the supplier relationship (authorisation / credit
              expectations).
            </p>
            <Textarea
              value={hqNotes}
              onChange={(e) => setHqNotes(e.target.value)}
              placeholder="Confirmation notes (optional)…"
            />
            <Button type="button" onClick={handleHqConfirm} disabled={actionLoading}>
              {actionLoading ? "Confirming…" : "Confirm return"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {ret.status === "draft" && (
          <Button type="button" onClick={handleSubmitForHq} disabled={actionLoading}>
            {actionLoading ? "Submitting…" : "Submit for HQ confirmation"}
          </Button>
        )}

        {ret.status === "hq_confirmed" && (
          <Button type="button" onClick={handleSubmitForApproval} disabled={actionLoading}>
            {actionLoading ? "Submitting…" : "Submit for dual approval"}
          </Button>
        )}

        {(ret.status === "pending_approval" || ret.status === "approved") && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncApproval}
            disabled={actionLoading}
          >
            Sync approval status
          </Button>
        )}

        {ret.status === "approved" && canDispatch && (
          <Button type="button" onClick={handleDispatch} disabled={actionLoading}>
            {actionLoading ? "Dispatching…" : "Dispatch (decrement inventory)"}
          </Button>
        )}

        <Link href="/supplier-returns">
          <Button type="button" variant="outline">
            Back to list
          </Button>
        </Link>
      </div>
    </div>
  );
}
