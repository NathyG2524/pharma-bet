import type {
  BuyMedicineInput,
  CanonicalMedicineDto,
  CanonicalMedicineListResponse,
  CreateDraftMedicineInput,
  CreateMedicineInput,
  DedupeCheckResponse,
  MedicineDto,
  MedicineListResponse,
  MedicineTransactionsResponse,
  SellMedicineInput,
  UpdateMedicineInput,
  UpdateMedicineOverlayInput,
} from "../types/medicine";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export class MedicinesApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Medicines API not configured (apiBaseUrl required)");
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

  async listMedicines(params?: {
    search?: string;
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  }): Promise<MedicineListResponse> {
    const q = buildQuery({
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
      includeInactive: params?.includeInactive,
    });
    return this.request<MedicineListResponse>(`/api/medicines${q}`);
  }

  async getMedicine(id: string): Promise<MedicineDto> {
    return this.request<MedicineDto>(`/api/medicines/${id}`);
  }

  async listCanonicalMedicines(params?: {
    search?: string;
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  }): Promise<CanonicalMedicineListResponse> {
    const q = buildQuery({
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
      includeInactive: params?.includeInactive,
    });
    return this.request<CanonicalMedicineListResponse>(`/api/medicines/catalog${q}`);
  }

  async getCanonicalMedicine(id: string): Promise<CanonicalMedicineDto> {
    return this.request<CanonicalMedicineDto>(`/api/medicines/catalog/${id}`);
  }

  async createMedicine(dto: CreateMedicineInput): Promise<CanonicalMedicineDto> {
    return this.request<CanonicalMedicineDto>("/api/medicines/catalog", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async updateMedicine(id: string, dto: UpdateMedicineInput): Promise<CanonicalMedicineDto> {
    return this.request<CanonicalMedicineDto>(`/api/medicines/catalog/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async listDraftMedicines(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CanonicalMedicineListResponse> {
    const q = buildQuery({
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
    });
    return this.request<CanonicalMedicineListResponse>(`/api/medicines/catalog/drafts${q}`);
  }

  async promoteDraftMedicine(id: string): Promise<CanonicalMedicineDto> {
    return this.request<CanonicalMedicineDto>(`/api/medicines/catalog/draft/${id}/promote`, {
      method: "POST",
    });
  }

  async createDraftMedicine(dto: CreateDraftMedicineInput): Promise<CanonicalMedicineDto> {
    return this.request<CanonicalMedicineDto>("/api/medicines/draft", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async dedupeCheck(params: {
    name?: string;
    sku?: string;
    barcode?: string;
  }): Promise<DedupeCheckResponse> {
    const q = buildQuery({ name: params.name, sku: params.sku, barcode: params.barcode });
    return this.request<DedupeCheckResponse>(`/api/medicines/dedupe-check${q}`);
  }

  async updateMedicineOverlay(id: string, dto: UpdateMedicineOverlayInput): Promise<MedicineDto> {
    return this.request<MedicineDto>(`/api/medicines/${id}/overlay`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async buyMedicine(medicineId: string, dto: BuyMedicineInput): Promise<unknown> {
    return this.request(`/api/medicines/${medicineId}/buy`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async sellMedicine(medicineId: string, dto: SellMedicineInput): Promise<unknown> {
    return this.request(`/api/medicines/${medicineId}/sell`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async getMedicineTransactions(
    medicineId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<MedicineTransactionsResponse> {
    const q = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    });
    return this.request<MedicineTransactionsResponse>(
      `/api/medicines/${medicineId}/transactions${q}`,
    );
  }
}

export const medicinesApi = new MedicinesApi();
