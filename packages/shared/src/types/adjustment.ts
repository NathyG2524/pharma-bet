export type AdjustmentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "posted";

export type AdjustmentReasonCode =
  | "shrink"
  | "damage"
  | "expiry_destruction"
  | "samples"
  | "theft"
  | "other";

export interface InventoryAdjustmentDto {
  id: string;
  tenantId: string;
  branchId: string;
  lotId: string;
  medicineId: string;
  /** Positive = increase, negative = decrease */
  quantity: number;
  reasonCode: AdjustmentReasonCode;
  notes: string | null;
  status: AdjustmentStatus;
  requestedByUserId: string;
  approvalInstanceId: string | null;
  postedAt: string | null;
  postedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustmentListResponse {
  items: InventoryAdjustmentDto[];
  total: number;
}

export interface CreateAdjustmentInput {
  lotId: string;
  quantity: number;
  reasonCode: AdjustmentReasonCode;
  notes?: string;
}

export interface SubmitAdjustmentInput {
  bmDelegateUserId?: string;
  bmUnavailable?: boolean;
}
