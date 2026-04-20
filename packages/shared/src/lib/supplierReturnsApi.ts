import type {
  CreateSupplierReturnInput,
  HqConfirmSupplierReturnInput,
  SubmitSupplierReturnForApprovalInput,
  SupplierReturnDto,
  SupplierReturnListResponse,
} from "../types/supplier-return";

export class SupplierReturnsApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("SupplierReturns API not configured (apiBaseUrl required)");
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

  async listReturns(): Promise<SupplierReturnListResponse> {
    return this.request<SupplierReturnListResponse>("/api/supplier-returns");
  }

  async getReturn(id: string): Promise<SupplierReturnDto> {
    return this.request<SupplierReturnDto>(`/api/supplier-returns/${id}`);
  }

  async createReturn(payload: CreateSupplierReturnInput): Promise<SupplierReturnDto> {
    return this.request<SupplierReturnDto>("/api/supplier-returns", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async submitForHqConfirmation(id: string): Promise<SupplierReturnDto> {
    return this.request<SupplierReturnDto>(`/api/supplier-returns/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async hqConfirm(id: string, payload: HqConfirmSupplierReturnInput): Promise<SupplierReturnDto> {
    return this.request<SupplierReturnDto>(`/api/supplier-returns/${id}/hq-confirm`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async submitForApproval(
    id: string,
    payload: SubmitSupplierReturnForApprovalInput,
  ): Promise<SupplierReturnDto> {
    return this.request<SupplierReturnDto>(`/api/supplier-returns/${id}/submit-approval`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async syncApprovalStatus(id: string): Promise<SupplierReturnDto> {
    return this.request<SupplierReturnDto>(`/api/supplier-returns/${id}/sync-approval`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async dispatch(id: string): Promise<SupplierReturnDto> {
    return this.request<SupplierReturnDto>(`/api/supplier-returns/${id}/dispatch`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}

export const supplierReturnsApi = new SupplierReturnsApi();
