import type {
  AssignMembershipInput,
  BranchDto,
  CreateBranchInput,
  CreateBranchInviteInput,
  CreateBranchInviteResultDto,
  MembershipDto,
  PendingBranchInviteDto,
} from "../types/tenancy";

export class BranchesApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Branches API not configured (apiBaseUrl required)");
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

  async listBranches(): Promise<BranchDto[]> {
    return this.request<BranchDto[]>("/api/branches");
  }

  async createBranch(dto: CreateBranchInput): Promise<BranchDto> {
    return this.request<BranchDto>("/api/branches", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async assignMembership(dto: AssignMembershipInput): Promise<MembershipDto> {
    return this.request<MembershipDto>("/api/memberships", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async listPendingBranchInvites(): Promise<PendingBranchInviteDto[]> {
    return this.request<PendingBranchInviteDto[]>("/api/branches/invites");
  }

  async createBranchInvite(dto: CreateBranchInviteInput): Promise<CreateBranchInviteResultDto> {
    return this.request<CreateBranchInviteResultDto>("/api/branches/invites", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async revokeBranchInvite(inviteId: string): Promise<PendingBranchInviteDto> {
    return this.request<PendingBranchInviteDto>(`/api/branches/invites/${inviteId}/revoke`, {
      method: "POST",
    });
  }
}

export const branchesApi = new BranchesApi();
