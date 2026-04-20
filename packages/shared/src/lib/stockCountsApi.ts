import type {
  CreateStockCountSessionInput,
  RecordVarianceInput,
  StockCountSessionDto,
  StockCountSessionListResponse,
  StockCountVarianceDto,
  SubmitSessionInput,
} from "../types/stock-count";

export class StockCountsApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("StockCounts API not configured (apiBaseUrl required)");
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

  async listSessions(): Promise<StockCountSessionListResponse> {
    return this.request<StockCountSessionListResponse>("/api/stock-counts");
  }

  async getSession(id: string): Promise<StockCountSessionDto> {
    return this.request<StockCountSessionDto>(`/api/stock-counts/${id}`);
  }

  async createSession(payload: CreateStockCountSessionInput): Promise<StockCountSessionDto> {
    return this.request<StockCountSessionDto>("/api/stock-counts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async recordVariance(
    sessionId: string,
    payload: RecordVarianceInput,
  ): Promise<StockCountVarianceDto> {
    return this.request<StockCountVarianceDto>(`/api/stock-counts/${sessionId}/variances`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async submitSession(sessionId: string, payload: SubmitSessionInput): Promise<StockCountSessionDto> {
    return this.request<StockCountSessionDto>(`/api/stock-counts/${sessionId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async syncApprovalStatus(sessionId: string): Promise<StockCountSessionDto> {
    return this.request<StockCountSessionDto>(`/api/stock-counts/${sessionId}/sync-approval`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async postSession(sessionId: string): Promise<StockCountSessionDto> {
    return this.request<StockCountSessionDto>(`/api/stock-counts/${sessionId}/post`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}

export const stockCountsApi = new StockCountsApi();
