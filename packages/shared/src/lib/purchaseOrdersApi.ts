import type {
  CreatePurchaseOrderInput,
  PurchaseOrderDecisionInput,
  PurchaseOrderDto,
  PurchaseOrderEventDto,
  PurchaseOrderListResponse,
  PurchaseOrderStatus,
  UpdatePurchaseOrderInput,
} from "../types/purchasing";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

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

  async listPurchaseOrders(params?: {
    status?: PurchaseOrderStatus;
  }): Promise<PurchaseOrderListResponse> {
    const q = buildQuery({ status: params?.status });
    return this.request<PurchaseOrderListResponse>(`/api/purchase-orders${q}`);
  }

  async listPurchaseOrderInbox(params?: {
    status?: PurchaseOrderStatus;
  }): Promise<PurchaseOrderListResponse> {
    const q = buildQuery({ status: params?.status });
    return this.request<PurchaseOrderListResponse>(`/api/purchase-orders/inbox${q}`);
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}`);
  }

  async getPurchaseOrderEvents(id: string): Promise<PurchaseOrderEventDto[]> {
    return this.request<PurchaseOrderEventDto[]>(`/api/purchase-orders/${id}/events`);
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderInput): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderInput): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async submitPurchaseOrder(id: string): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}/submit`, {
      method: "POST",
    });
  }

  async approvePurchaseOrder(id: string): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}/approve`, {
      method: "POST",
    });
  }

  async rejectPurchaseOrder(
    id: string,
    dto: PurchaseOrderDecisionInput,
  ): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async requestPurchaseOrderChanges(
    id: string,
    dto: PurchaseOrderDecisionInput,
  ): Promise<PurchaseOrderDto> {
    return this.request<PurchaseOrderDto>(`/api/purchase-orders/${id}/request-changes`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }
}

export const purchaseOrdersApi = new PurchaseOrdersApi();
