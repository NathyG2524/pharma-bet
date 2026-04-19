import type { BranchDto } from "./tenancy";

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "changes_requested";

export interface SupplierDto {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLineDto {
  id: string;
  purchaseOrderId: string;
  medicineId: string;
  quantity: number;
  unitCost: string | null;
  createdAt: string;
  medicine?: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  };
}

export interface PurchaseOrderEventDto {
  id: string;
  purchaseOrderId: string;
  tenantId: string;
  branchId: string;
  userId: string;
  action: string;
  reason: string | null;
  createdAt: string;
}

export interface PurchaseOrderDto {
  id: string;
  tenantId: string;
  branchId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  supplier?: SupplierDto;
  branch?: BranchDto;
  lines?: PurchaseOrderLineDto[];
}

export interface NotificationDto {
  id: string;
  tenantId: string;
  branchId: string;
  type: string;
  title: string;
  message: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrderDto[];
  total: number;
}

export interface PurchaseOrderEventsResponse {
  items: PurchaseOrderEventDto[];
}

export interface SupplierListResponse {
  items: SupplierDto[];
}

export interface NotificationListResponse {
  items: NotificationDto[];
}

export interface CreateSupplierInput {
  name: string;
  email?: string;
  phone?: string;
}

export interface PurchaseOrderLineInput {
  medicineId: string;
  quantity: number;
  unitCost?: string;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  branchId: string;
  notes?: string;
  lines: PurchaseOrderLineInput[];
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string;
  branchId?: string;
  notes?: string | null;
  lines?: PurchaseOrderLineInput[];
}

export interface PurchaseOrderDecisionInput {
  reason: string;
}
