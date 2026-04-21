import type { AuthResponseDto } from "../types/auth";

export type InviteLookupDto = {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  expiresAt: string;
};

export type AcceptInviteInput = {
  token: string;
  password: string;
};

export class InvitesApi {
  private apiBaseUrl: string | null = null;

  configure(options: { apiBaseUrl?: string }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Invites API not configured (apiBaseUrl required)");
    }
    const url = `${this.apiBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} ${text}`);
    }
    return res.json();
  }

  async lookupInvite(token: string): Promise<InviteLookupDto> {
    return this.request<InviteLookupDto>(`/api/invites/${encodeURIComponent(token)}`);
  }

  async acceptInvite(body: AcceptInviteInput): Promise<AuthResponseDto> {
    return this.request<AuthResponseDto>("/api/invites/accept", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export const invitesApi = new InvitesApi();
