import type {
  BranchTaxSettingsDto,
  CreateTaxCategoryInput,
  TaxCategoryDto,
  UpdateBranchTaxSettingsInput,
} from "../types/tax";

export class TaxesApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Taxes API not configured (apiBaseUrl required)");
    }
    const url = `${this.apiBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    const authHeaders = this.getAuthHeaders?.() ?? {};
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options.headers as Record<string, string>),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} ${text}`);
    }
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }
    return res.json();
  }

  async listTaxCategories(): Promise<TaxCategoryDto[]> {
    return this.request<TaxCategoryDto[]>("/api/tax-categories");
  }

  async createTaxCategory(dto: CreateTaxCategoryInput): Promise<TaxCategoryDto> {
    return this.request<TaxCategoryDto>("/api/tax-categories", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async getBranchTaxSettings(branchId: string): Promise<BranchTaxSettingsDto> {
    return this.request<BranchTaxSettingsDto>(`/api/branches/${branchId}/tax-settings`);
  }

  async updateBranchTaxSettings(
    branchId: string,
    dto: UpdateBranchTaxSettingsInput,
  ): Promise<BranchTaxSettingsDto> {
    return this.request<BranchTaxSettingsDto>(`/api/branches/${branchId}/tax-settings`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }
}

export const taxesApi = new TaxesApi();
