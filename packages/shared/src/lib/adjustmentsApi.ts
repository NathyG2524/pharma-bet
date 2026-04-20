import type {
  AdjustmentListResponse,
  CreateAdjustmentInput,
  InventoryAdjustmentDto,
  SubmitAdjustmentInput,
} from "../types/adjustment";

export class AdjustmentsApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Adjustments API not configured (apiBaseUrl required)");
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

  async listAdjustments(): Promise<AdjustmentListResponse> {
    return this.request<AdjustmentListResponse>("/api/adjustments");
  }

  async getAdjustment(id: string): Promise<InventoryAdjustmentDto> {
    return this.request<InventoryAdjustmentDto>(`/api/adjustments/${id}`);
  }

  async createAdjustment(payload: CreateAdjustmentInput): Promise<InventoryAdjustmentDto> {
    return this.request<InventoryAdjustmentDto>("/api/adjustments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async submitForApproval(
    id: string,
    payload: SubmitAdjustmentInput,
  ): Promise<InventoryAdjustmentDto> {
    return this.request<InventoryAdjustmentDto>(`/api/adjustments/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async syncApprovalStatus(id: string): Promise<InventoryAdjustmentDto> {
    return this.request<InventoryAdjustmentDto>(`/api/adjustments/${id}/sync-approval`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async postAdjustment(id: string): Promise<InventoryAdjustmentDto> {
    return this.request<InventoryAdjustmentDto>(`/api/adjustments/${id}/post`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}

export const adjustmentsApi = new AdjustmentsApi();
