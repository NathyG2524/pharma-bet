export interface SaleLineAllocationDto {
  id: string;
  lotId: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  quantity: number;
}

export interface SaleLineDto {
  id: string;
  saleId: string;
  medicineId: string;
  quantity: number;
  unitPrice: string;
  taxBase: string | null;
  taxRate: string | null;
  taxAmount: string | null;
  lineSubtotal: string;
  lineTotal: string;
  cogsAmount: string;
  overrideReason: string | null;
  createdAt: string;
  medicine?: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  };
  allocations: SaleLineAllocationDto[];
}

export interface SaleDto {
  id: string;
  tenantId: string;
  branchId: string;
  patientId: string | null;
  recordedAt: string;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  totalAmount: string;
  cogsTotal: string;
  createdAt: string;
  updatedAt: string;
  lines: SaleLineDto[];
}

export interface SaleLineAllocationInput {
  lotId: string;
  quantity: number;
}

export interface CreateSaleLineInput {
  medicineId: string;
  quantity: number;
  unitPrice?: string;
  overrideReason?: string;
  allocations?: SaleLineAllocationInput[];
}

export interface CreateSaleInput {
  patientId?: string;
  recordedAt: string;
  notes?: string;
  lines: CreateSaleLineInput[];
}
