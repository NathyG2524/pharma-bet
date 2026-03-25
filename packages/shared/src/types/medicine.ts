export interface MedicineDto {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientSummaryDto {
  id: string;
  phone: string;
  name: string | null;
}

export interface MedicineTransactionDto {
  id: string;
  medicineId: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  unitPrice: string | null;
  recordedAt: string;
  patientId: string | null;
  notes: string | null;
  createdAt: string;
  patient?: PatientSummaryDto | null;
}

export interface MedicineListResponse {
  items: MedicineDto[];
  total: number;
}

export interface MedicineTransactionsResponse {
  items: MedicineTransactionDto[];
  total: number;
}

export interface CreateMedicineInput {
  name: string;
  sku?: string;
  unit?: string;
}

export interface UpdateMedicineInput {
  name?: string;
  sku?: string | null;
  unit?: string | null;
  isActive?: boolean;
}

export interface BuyMedicineInput {
  quantity: number;
  unitPrice?: string;
  recordedAt: string;
  notes?: string;
}

export interface SellMedicineInput {
  quantity: number;
  patientId?: string;
  unitPrice?: string;
  recordedAt: string;
  notes?: string;
}
