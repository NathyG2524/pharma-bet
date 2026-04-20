export const InventoryLotStatus = {
  ACTIVE: "ACTIVE",
  QUARANTINE: "QUARANTINE",
  RECALLED: "RECALLED",
} as const;

export type InventoryLotStatus = (typeof InventoryLotStatus)[keyof typeof InventoryLotStatus];

export interface InventoryLotDto {
  id: string;
  medicineId: string;
  medicineName: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  status: InventoryLotStatus;
  quantityOnHand: number;
  isExpired: boolean;
}

export interface InventoryLotListResponse {
  items: InventoryLotDto[];
  total: number;
}

export interface InventoryValuationLineDto {
  medicineId: string;
  medicineName: string;
  quantityOnHand: number;
  totalValue: string;
}

export interface InventoryValuationResponse {
  totalValue: string;
  lines: InventoryValuationLineDto[];
}

export interface UpdateLotStatusRequest {
  status: InventoryLotStatus;
  reason?: string | null;
}
