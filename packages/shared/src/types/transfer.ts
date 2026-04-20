import type { BranchDto } from "./tenancy";

export type TransferStatus = "draft" | "in_transit" | "received" | "received_with_variance";

export interface TransferLineAllocationDto {
  id: string;
  transferLineId: string;
  lotId: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  quantityShipped: number;
  quantityReceived: number;
  createdAt: string;
}

export interface TransferLineDto {
  id: string;
  transferId: string;
  medicineId: string;
  quantity: number;
  overrideReason: string | null;
  createdAt: string;
  medicine?: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  };
  allocations: TransferLineAllocationDto[];
}

export interface TransferDto {
  id: string;
  tenantId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  status: TransferStatus;
  notes: string | null;
  createdBy: string | null;
  shippedBy: string | null;
  receivedBy: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceBranch?: BranchDto;
  destinationBranch?: BranchDto;
  lines: TransferLineDto[];
}

export interface TransferListResponse {
  items: TransferDto[];
  total: number;
}

export interface CreateTransferLineInput {
  medicineId: string;
  quantity: number;
}

export interface CreateTransferInput {
  destinationBranchId: string;
  notes?: string;
  lines: CreateTransferLineInput[];
}

export interface ShipTransferLineAllocationInput {
  lotId: string;
  quantity: number;
}

export interface ShipTransferLineInput {
  transferLineId: string;
  allocations?: ShipTransferLineAllocationInput[];
  overrideReason?: string;
}

export interface ShipTransferInput {
  lines?: ShipTransferLineInput[];
}

export interface ReceiveTransferAllocationInput {
  allocationId: string;
  quantityReceived: number;
}

export interface ReceiveTransferInput {
  allocations: ReceiveTransferAllocationInput[];
}
