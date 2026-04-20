"use client";

import { inventoryApi, stockCountsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type {
  InventoryLotDto,
  StockCountReasonCode,
  StockCountSessionDto,
  StockCountSessionStatus,
} from "@drug-store/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
} from "@drug-store/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

const REASON_CODES: { value: StockCountReasonCode; label: string }[] = [
  { value: "counting_error", label: "Counting error" },
  { value: "expiry_destruction", label: "Expiry destruction" },
  { value: "theft", label: "Theft" },
  { value: "damage", label: "Damage" },
  { value: "other", label: "Other" },
];

export default function StockCountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state } = useAuthContext();
  const canPost = state.roles.some((role) =>
    ["branch_manager", "hq_admin", "platform_admin"].includes(role),
  );

  const [session, setSession] = useState<StockCountSessionDto | null>(null);
  const [lots, setLots] = useState<InventoryLotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Variance form state
  const [varianceLotId, setVarianceLotId] = useState("");
  const [countedQty, setCountedQty] = useState("0");
  const [varianceReason, setVarianceReason] = useState<StockCountReasonCode>("counting_error");
  const [varianceNotes, setVarianceNotes] = useState("");
  const [varianceError, setVarianceError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionData, lotsData] = await Promise.all([
        stockCountsApi.getSession(id),
        inventoryApi.listLots(),
      ]);
      setSession(sessionData);
      setLots(lotsData.items);
      if (lotsData.items.length > 0 && !varianceLotId) {
        setVarianceLotId(lotsData.items[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [id, varianceLotId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRecordVariance = async () => {
    setVarianceError(null);
    const qty = Number.parseInt(countedQty, 10);
    if (Number.isNaN(qty) || qty < 0) {
      setVarianceError("Counted quantity must be a non-negative integer.");
      return;
    }
    if (!varianceLotId) {
      setVarianceError("Select a lot.");
      return;
    }
    setActionLoading(true);
    try {
      await stockCountsApi.recordVariance(id, {
        lotId: varianceLotId,
        countedQuantity: qty,
        reasonCode: varianceReason,
        notes: varianceNotes.trim() || undefined,
      });
      setVarianceNotes("");
      await load();
    } catch (err) {
      setVarianceError(err instanceof Error ? err.message : "Failed to record variance");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await stockCountsApi.submitSession(id, {});
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit session");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await stockCountsApi.syncApprovalStatus(id);
      setSession(updated);
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
      const updated = await stockCountsApi.postSession(id);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post session");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!session) return <Alert variant="destructive">{error ?? "Session not found"}</Alert>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Stock count session {session.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Record counted quantities per lot. Submit for dual BM + HQ approval before posting.
          </p>
        </div>
        <Badge variant={statusVariants[session.status]}>{statusLabels[session.status]}</Badge>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="font-medium text-gray-600">Opened by</dt>
            <dd className="text-gray-900">{session.openedByUserId}</dd>

            {session.notes && (
              <>
                <dt className="font-medium text-gray-600">Notes</dt>
                <dd className="text-gray-900">{session.notes}</dd>
              </>
            )}

            {session.approvalInstanceId && (
              <>
                <dt className="font-medium text-gray-600">Approval</dt>
                <dd className="text-gray-900">
                  <Link
                    href={`/approvals?domainType=stock_count&domainId=${session.id}`}
                    className="text-primary underline hover:text-primary_container"
                  >
                    View approval
                  </Link>
                </dd>
              </>
            )}

            {session.postedAt && (
              <>
                <dt className="font-medium text-gray-600">Posted at</dt>
                <dd className="text-gray-900">{new Date(session.postedAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Variance list */}
      <Card>
        <CardHeader>
          <CardTitle>Variance proposals ({session.variances?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!session.variances || session.variances.length === 0 ? (
            <p className="text-sm text-gray-500">No variances recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 font-semibold text-gray-600">Lot</th>
                    <th className="px-2 py-2 font-semibold text-gray-600">System qty</th>
                    <th className="px-2 py-2 font-semibold text-gray-600">Counted qty</th>
                    <th className="px-2 py-2 font-semibold text-gray-600">Variance</th>
                    <th className="px-2 py-2 font-semibold text-gray-600">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {session.variances.map((v) => (
                    <tr key={v.id} className="border-t border-outline_variant/20">
                      <td className="px-2 py-2">{v.lotId.slice(0, 8).toUpperCase()}</td>
                      <td className="px-2 py-2">{v.systemQuantity}</td>
                      <td className="px-2 py-2">{v.countedQuantity}</td>
                      <td
                        className={`px-2 py-2 font-semibold ${
                          v.varianceQuantity < 0
                            ? "text-red-600"
                            : v.varianceQuantity > 0
                              ? "text-green-600"
                              : "text-gray-500"
                        }`}
                      >
                        {v.varianceQuantity > 0 ? `+${v.varianceQuantity}` : v.varianceQuantity}
                      </td>
                      <td className="px-2 py-2">{v.reasonCode.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add variance form (only when session is open) */}
      {session.status === "open" && (
        <Card>
          <CardHeader>
            <CardTitle>Record variance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {varianceError && <Alert variant="destructive">{varianceError}</Alert>}

            <div>
              <label
                htmlFor="variance-lot"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Lot
              </label>
              <Select
                id="variance-lot"
                value={varianceLotId}
                onChange={(e) => setVarianceLotId(e.target.value)}
                disabled={actionLoading}
              >
                <option value="">Select lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.medicineName} — {lot.lotCode} (on-hand: {lot.quantityOnHand})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="counted-qty"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Counted quantity
              </label>
              <Input
                id="counted-qty"
                type="number"
                min="0"
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                disabled={actionLoading}
              />
            </div>

            <div>
              <label
                htmlFor="variance-reason"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Reason code
              </label>
              <Select
                id="variance-reason"
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value as StockCountReasonCode)}
                disabled={actionLoading}
              >
                {REASON_CODES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="variance-notes"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Notes
              </label>
              <Textarea
                id="variance-notes"
                value={varianceNotes}
                onChange={(e) => setVarianceNotes(e.target.value)}
                placeholder="Optional notes…"
                disabled={actionLoading}
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleRecordVariance} disabled={actionLoading}>
                Record variance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session workflow actions */}
      <div className="flex flex-wrap gap-3">
        {session.status === "open" && (
          <Button
            type="button"
            onClick={handleSubmitForApproval}
            disabled={actionLoading}
          >
            Submit for approval
          </Button>
        )}
        {(session.status === "submitted" || session.status === "approved") && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncApproval}
            disabled={actionLoading}
          >
            Sync approval status
          </Button>
        )}
        {session.status === "approved" && canPost && (
          <Button type="button" onClick={handlePost} disabled={actionLoading}>
            Post to ledger
          </Button>
        )}
        <Link href="/stock-counts">
          <Button type="button" variant="outline">
            Back to list
          </Button>
        </Link>
      </div>
    </div>
  );
}
