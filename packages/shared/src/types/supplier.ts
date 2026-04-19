export interface SupplierDto {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResponse {
  items: SupplierDto[];
  total: number;
}

export interface SupplierProductDto {
  id: string;
  supplierId: string;
  medicineId: string;
  supplierSku: string | null;
  packSize: number | null;
  packUnit: string | null;
  createdAt: string;
  updatedAt: string;
  medicine: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  } | null;
}

export interface SupplierProductListResponse {
  items: SupplierProductDto[];
  total: number;
}

export interface CreateSupplierInput {
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierInput {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CreateSupplierProductInput {
  medicineId: string;
  supplierSku?: string | null;
  packSize?: number | null;
  packUnit?: string | null;
}

export interface UpdateSupplierProductInput {
  supplierSku?: string | null;
  packSize?: number | null;
  packUnit?: string | null;
}
