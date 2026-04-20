export interface TaxCategoryDto {
  id: string;
  tenantId: string;
  name: string;
  rate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxCategoryInput {
  name: string;
  rate: string;
}

export interface BranchTaxSettingsDto {
  id: string;
  tenantId: string;
  branchId: string;
  defaultTaxCategoryId: string | null;
  taxRateOverride: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBranchTaxSettingsInput {
  defaultTaxCategoryId?: string | null;
  taxRateOverride?: string | null;
}
