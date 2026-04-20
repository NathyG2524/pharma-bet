import type {
  CreateTransferInput,
  ReceiveTransferInput,
  ShipTransferInput,
  TransferDto,
  TransferListResponse,
} from "../types/transfer";

export class TransfersApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Transfers API not configured (apiBaseUrl required)");
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

  async listTransfers(): Promise<TransferListResponse> {
    return this.request<TransferListResponse>("/api/transfers");
  }

  async getTransfer(id: string): Promise<TransferDto> {
    return this.request<TransferDto>(`/api/transfers/${id}`);
  }

  async createTransfer(payload: CreateTransferInput): Promise<TransferDto> {
    return this.request<TransferDto>("/api/transfers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async shipTransfer(id: string, payload: ShipTransferInput): Promise<TransferDto> {
    return this.request<TransferDto>(`/api/transfers/${id}/ship`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async receiveTransfer(id: string, payload: ReceiveTransferInput): Promise<TransferDto> {
    return this.request<TransferDto>(`/api/transfers/${id}/receive`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const transfersApi = new TransfersApi();
