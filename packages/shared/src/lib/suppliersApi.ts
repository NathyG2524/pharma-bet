import type {
  CreateSupplierInput,
  CreateSupplierProductInput,
  SupplierDto,
  SupplierListResponse,
  SupplierProductDto,
  SupplierProductListResponse,
  UpdateSupplierInput,
  UpdateSupplierProductInput,
} from "../types/supplier";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export class SuppliersApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Suppliers API not configured (apiBaseUrl required)");
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

  async listSuppliers(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<SupplierListResponse> {
    const q = buildQuery({
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
    });
    return this.request<SupplierListResponse>(`/api/suppliers${q}`);
  }

  async getSupplier(id: string): Promise<SupplierDto> {
    return this.request<SupplierDto>(`/api/suppliers/${id}`);
  }

  async createSupplier(dto: CreateSupplierInput): Promise<SupplierDto> {
    return this.request<SupplierDto>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async updateSupplier(id: string, dto: UpdateSupplierInput): Promise<SupplierDto> {
    return this.request<SupplierDto>(`/api/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async deleteSupplier(id: string): Promise<void> {
    return this.request<void>(`/api/suppliers/${id}`, {
      method: "DELETE",
    });
  }

  async listSupplierMappings(
    supplierId: string,
    params?: { search?: string; limit?: number; offset?: number },
  ): Promise<SupplierProductListResponse> {
    const q = buildQuery({
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
    });
    return this.request<SupplierProductListResponse>(`/api/suppliers/${supplierId}/mappings${q}`);
  }

  async createSupplierMapping(
    supplierId: string,
    dto: CreateSupplierProductInput,
  ): Promise<SupplierProductDto> {
    return this.request<SupplierProductDto>(`/api/suppliers/${supplierId}/mappings`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async updateSupplierMapping(
    supplierId: string,
    mappingId: string,
    dto: UpdateSupplierProductInput,
  ): Promise<SupplierProductDto> {
    return this.request<SupplierProductDto>(`/api/suppliers/${supplierId}/mappings/${mappingId}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async deleteSupplierMapping(supplierId: string, mappingId: string): Promise<void> {
    return this.request<void>(`/api/suppliers/${supplierId}/mappings/${mappingId}`, {
      method: "DELETE",
    });
  }
}

export const suppliersApi = new SuppliersApi();
