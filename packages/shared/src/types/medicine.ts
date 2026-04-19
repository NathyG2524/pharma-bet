export type MedicineStatus = "canonical" | "draft";

export interface MedicineDto {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  barcode: string | null;
  isActive: boolean;
  status: MedicineStatus;
  draftBranchId: string | null;
  taxCategoryId: string | null;
  stockQuantity: number;
  reorderMin: number | null;
  reorderMax: number | null;
  binLocation: string | null;
  localPrice: string | null;
  localCost: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalMedicineDto {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  barcode: string | null;
  isActive: boolean;
  status: MedicineStatus;
  draftBranchId: string | null;
  taxCategoryId: string | null;
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
  type: "BUY" | "SELL";
  quantity: number;
  unitPrice: string | null;
  taxBase: string | null;
  taxRate: string | null;
  taxAmount: string | null;
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

export interface CanonicalMedicineListResponse {
  items: CanonicalMedicineDto[];
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
  barcode?: string;
  taxCategoryId?: string;
}

export interface CreateDraftMedicineInput {
  name: string;
  sku?: string;
  unit?: string;
  barcode?: string;
  taxCategoryId?: string;
}

export interface DedupeHintDto {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  status: MedicineStatus;
  draftBranchId: string | null;
  matchedOn: ("name" | "sku" | "barcode")[];
}

export interface DedupeCheckResponse {
  hints: DedupeHintDto[];
}

export interface UpdateMedicineInput {
  name?: string;
  sku?: string | null;
  unit?: string | null;
  isActive?: boolean;
  taxCategoryId?: string | null;
}

export interface UpdateMedicineOverlayInput {
  reorderMin?: number | null;
  reorderMax?: number | null;
  binLocation?: string | null;
  localPrice?: string | null;
  localCost?: string | null;
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
