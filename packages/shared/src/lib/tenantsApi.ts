import type {
  CreateTenantInput,
  CreateTenantResultDto,
  PendingHqInviteDto,
  TenantDto,
} from "../types/tenancy";

export class TenantsApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Tenants API not configured (apiBaseUrl required)");
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

  async listTenants(): Promise<TenantDto[]> {
    return this.request<TenantDto[]>("/api/tenants");
  }

  async createTenant(dto: CreateTenantInput): Promise<CreateTenantResultDto> {
    return this.request<CreateTenantResultDto>("/api/tenants", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async listPendingHqInvites(tenantId?: string): Promise<PendingHqInviteDto[]> {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    return this.request<PendingHqInviteDto[]>(`/api/tenants/hq-invites${query}`);
  }

  async revokePendingHqInvite(inviteId: string): Promise<PendingHqInviteDto> {
    return this.request<PendingHqInviteDto>(`/api/tenants/hq-invites/${inviteId}/revoke`, {
      method: "POST",
    });
  }
}

export const tenantsApi = new TenantsApi();
