export type StockCountSessionStatus =
  | "open"
  | "submitted"
  | "approved"
  | "rejected"
  | "posted";

export type StockCountReasonCode =
  | "counting_error"
  | "expiry_destruction"
  | "theft"
  | "damage"
  | "other";

export interface StockCountVarianceDto {
  id: string;
  sessionId: string;
  tenantId: string;
  branchId: string;
  lotId: string;
  medicineId: string;
  systemQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  reasonCode: StockCountReasonCode;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockCountSessionDto {
  id: string;
  tenantId: string;
  branchId: string;
  status: StockCountSessionStatus;
  notes: string | null;
  openedByUserId: string;
  approvalInstanceId: string | null;
  submittedAt: string | null;
  postedAt: string | null;
  postedByUserId: string | null;
  variances?: StockCountVarianceDto[];
  createdAt: string;
  updatedAt: string;
}

export interface StockCountSessionListResponse {
  items: StockCountSessionDto[];
  total: number;
}

export interface CreateStockCountSessionInput {
  notes?: string;
}

export interface RecordVarianceInput {
  lotId: string;
  countedQuantity: number;
  reasonCode: StockCountReasonCode;
  notes?: string;
}

export interface SubmitSessionInput {
  bmDelegateUserId?: string;
  bmUnavailable?: boolean;
}
