"use client";

import { approvalsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { ApprovalInstanceDto, RecordApprovalDecisionInput } from "@drug-store/shared";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Textarea } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ApprovalStatus = "pending" | "approved" | "rejected";

const statusVariants: Record<ApprovalStatus, "default" | "success" | "warning" | "destructive"> =
  {
    pending: "warning",
    approved: "success",
    rejected: "destructive",
  };

export default function ApprovalsInboxPage() {
  const { state } = useAuthContext();
  const isApprover = state.roles.some((role) =>
    ["branch_manager", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const isHq = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const isBm = state.roles.some((role) => ["branch_manager"].includes(role));

  const [approvals, setApprovals] = useState<ApprovalInstanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision modal state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lane, setLane] = useState<"bm" | "hq">("bm");
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [reason, setReason] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isApprover) return;
    setLoading(true);
    setError(null);
    try {
      const items = await approvalsApi.listApprovals();
      setApprovals(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [isApprover]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecide = async () => {
    if (!selectedId) return;
    setDeciding(true);
    setDecisionError(null);
    try {
      const payload: RecordApprovalDecisionInput = {
        lane,
        decision,
        reason: reason.trim() || undefined,
      };
      await approvalsApi.recordDecision(selectedId, payload);
      setSelectedId(null);
      setReason("");
      await load();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Failed to record decision");
    } finally {
      setDeciding(false);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const otherApprovals = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals inbox</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and decide on adjustment and stock count approval requests.
        </p>
      </div>

      {!isApprover && (
        <Alert variant="destructive">
          You need Branch Manager or HQ role to access the approvals inbox.
        </Alert>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Decision panel */}
      {selectedId && (
        <Card>
          <CardHeader>
            <CardTitle>Record decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {decisionError && <Alert variant="destructive">{decisionError}</Alert>}

            <div>
              <label htmlFor="lane" className="mb-1.5 block text-sm font-medium text-gray-700">
                Approval lane
              </label>
              <Select
                id="lane"
                value={lane}
                onChange={(e) => setLane(e.target.value as "bm" | "hq")}
                disabled={deciding}
              >
                {isBm && <option value="bm">Branch Manager (BM)</option>}
                {isHq && <option value="hq">HQ Approver</option>}
              </Select>
            </div>

            <div>
              <label
                htmlFor="decision"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Decision
              </label>
              <Select
                id="decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value as "approved" | "rejected")}
                disabled={deciding}
              >
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
              </Select>
            </div>

            <div>
              <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason / note
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional explanation for audit trail…"
                disabled={deciding}
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" onClick={handleDecide} disabled={deciding}>
                {deciding ? "Submitting…" : "Submit decision"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedId(null);
                  setDecisionError(null);
                }}
                disabled={deciding}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Pending ({pendingApprovals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : pendingApprovals.length === 0 ? (
            <p className="text-sm text-gray-500">No pending approvals.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-on_surface_variant">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      ID
                    </th>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      BM decision
                    </th>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      HQ decision
                    </th>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      Requested by
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((a) => (
                    <tr key={a.id} className="border-t border-outline_variant/20">
                      <td className="px-4 py-3 font-medium text-on_surface">
                        {a.domainType.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3">{a.domainId.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">
                        {a.bmDecision ? (
                          <Badge variant={a.bmDecision === "approved" ? "success" : "destructive"}>
                            {a.bmDecision}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.hqDecision ? (
                          <Badge variant={a.hqDecision === "approved" ? "success" : "destructive"}>
                            {a.hqDecision}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{a.requestedByUserId}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedId(a.id);
                            setLane(isBm && !isHq ? "bm" : "hq");
                            setDecision("approved");
                            setReason("");
                            setDecisionError(null);
                          }}
                        >
                          Decide
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent completed */}
      {otherApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent ({otherApprovals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-on_surface_variant">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      ID
                    </th>
                    <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {otherApprovals.slice(0, 20).map((a) => (
                    <tr key={a.id} className="border-t border-outline_variant/20">
                      <td className="px-4 py-3">{a.domainType.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">{a.domainId.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariants[a.status as ApprovalStatus]}>{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {a.domainType === "adjustment" && (
                          <Link
                            href={`/adjustments/${a.domainId}`}
                            className="text-primary underline hover:text-primary_container text-xs"
                          >
                            View adjustment
                          </Link>
                        )}
                        {a.domainType === "stock_count" && (
                          <Link
                            href={`/stock-counts/${a.domainId}`}
                            className="text-primary underline hover:text-primary_container text-xs"
                          >
                            View session
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
