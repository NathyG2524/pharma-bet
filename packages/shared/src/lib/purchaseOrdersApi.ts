import type {
  CreatePurchaseOrderInput,
  PurchaseOrderDto,
  PurchaseOrderListResponse,
  PurchaseOrderReceiptDto,
  ReceivePurchaseOrderInput,
} from "../types/purchase-order";

export class PurchaseOrdersApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Purchase orders API not configured (apiBaseUrl required)");
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

  async listPurchaseOrders(): Promise<PurchaseOrderListResponse> {
    return this.request<PurchaseOrderListResponse>("/api/purchase-orders");
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}`);
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderInput): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async approvePurchaseOrder(id: string): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}/approve`, {
      method: "POST",
    });
  }

  async receivePurchaseOrder(
    id: string,
    dto: ReceivePurchaseOrderInput,
  ): Promise<PurchaseOrderReceiptDto> {
    return this.request<PurchaseOrderReceiptDto>(`/api/purchase-orders/${id}/receive`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }
}

export const purchaseOrdersApi = new PurchaseOrdersApi();
