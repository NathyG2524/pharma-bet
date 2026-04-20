export type SupplierReturnStatus =
  | "draft"
  | "pending_hq_confirmation"
  | "hq_confirmed"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "dispatched";

export interface SupplierReturnLineDto {
  id: string;
  returnId: string;
  tenantId: string;
  branchId: string;
  lotId: string;
  medicineId: string;
  /** Always positive: units returned to supplier */
  quantity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierReturnDto {
  id: string;
  tenantId: string;
  branchId: string;
  supplierId: string;
  sourcePurchaseOrderId: string | null;
  sourceReceiptId: string | null;
  status: SupplierReturnStatus;
  notes: string | null;
  requestedByUserId: string;
  hqConfirmedByUserId: string | null;
  hqConfirmedAt: string | null;
  hqConfirmationNotes: string | null;
  approvalInstanceId: string | null;
  dispatchedAt: string | null;
  dispatchedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: SupplierReturnLineDto[];
}

export interface SupplierReturnListResponse {
  items: SupplierReturnDto[];
  total: number;
}

export interface CreateSupplierReturnLineInput {
  lotId: string;
  quantity: number;
  notes?: string;
}

export interface CreateSupplierReturnInput {
  supplierId: string;
  sourcePurchaseOrderId?: string;
  sourceReceiptId?: string;
  notes?: string;
  lines: CreateSupplierReturnLineInput[];
}

export interface HqConfirmSupplierReturnInput {
  notes?: string;
}

export interface SubmitSupplierReturnForApprovalInput {
  bmDelegateUserId?: string;
  bmUnavailable?: boolean;
}
