export interface ApprovalInstanceDto {
  id: string;
  tenantId: string;
  branchId: string | null;
  domainType: string;
  domainId: string;
  requestedByUserId: string;
  status: "pending" | "approved" | "rejected";
  bmApproverUserId: string | null;
  bmDecision: "approved" | "rejected" | null;
  bmDecisionPath: string | null;
  bmDecisionReason: string | null;
  bmDecidedAt: string | null;
  hqApproverUserId: string | null;
  hqDecision: "approved" | "rejected" | null;
  hqDecisionPath: string | null;
  hqDecisionReason: string | null;
  hqDecidedAt: string | null;
  approvalPath: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RecordApprovalDecisionInput {
  lane: "bm" | "hq";
  decision: "approved" | "rejected";
  reason?: string;
}

export interface SubmitApprovalInput {
  domainType: string;
  domainId: string;
  branchId?: string;
  bmDelegateUserId?: string;
  bmUnavailable?: boolean;
}
