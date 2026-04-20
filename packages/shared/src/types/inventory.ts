export interface InventoryLotDto {
  id: string;
  medicineId: string;
  medicineName: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
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
