export type PurchaseOrderStatus = "DRAFT" | "APPROVED" | "RECEIVED";

export interface PurchaseOrderLineDto {
  id: string;
  medicineId: string;
  medicineName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: string | null;
}

export interface PurchaseOrderReceiptLineDto {
  id: string;
  purchaseOrderLineId: string;
  medicineId: string;
  lotCode: string;
  expiryDate: string;
  quantity: number;
  unitCost: string;
  expiryOverrideReason: string | null;
}

export interface PurchaseOrderReceiptDto {
  id: string;
  receiptKey: string;
  receivedAt: string;
  lines: PurchaseOrderReceiptLineDto[];
}

export interface PurchaseOrderDto {
  id: string;
  branchId: string;
  branchName: string;
  orderNumber: string | null;
  status: PurchaseOrderStatus;
  createdAt: string;
  updatedAt: string;
  lines: PurchaseOrderLineDto[];
  receipts: PurchaseOrderReceiptDto[];
}

export interface PurchaseOrderListItemDto {
  id: string;
  branchId: string;
  branchName: string;
  orderNumber: string | null;
  status: PurchaseOrderStatus;
  createdAt: string;
  updatedAt: string;
  lineCount: number;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrderListItemDto[];
  total: number;
}

export interface CreatePurchaseOrderLineInput {
  medicineId: string;
  quantity: number;
  unitCost?: string;
}

export interface CreatePurchaseOrderInput {
  branchId: string;
  orderNumber?: string;
  lines: CreatePurchaseOrderLineInput[];
}

export interface ReceivePurchaseOrderLineInput {
  purchaseOrderLineId: string;
  lotCode: string;
  expiryDate: string;
  quantity: number;
  unitCost: string;
  expiryOverrideReason?: string;
}

export interface ReceivePurchaseOrderInput {
  receiptKey: string;
  receivedAt: string;
  lines: ReceivePurchaseOrderLineInput[];
}
