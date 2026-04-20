import type {
  ApprovalInstanceDto,
  RecordApprovalDecisionInput,
  SubmitApprovalInput,
} from "../types/approval";

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export class ApprovalsApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Approvals API not configured (apiBaseUrl required)");
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

  async listApprovals(params?: {
    domainType?: string;
    domainId?: string;
  }): Promise<ApprovalInstanceDto[]> {
    const q = buildQuery({
      domainType: params?.domainType,
      domainId: params?.domainId,
    });
    return this.request<ApprovalInstanceDto[]>(`/api/approvals${q}`);
  }

  async getApproval(id: string): Promise<ApprovalInstanceDto> {
    return this.request<ApprovalInstanceDto>(`/api/approvals/${id}`);
  }

  async submitApproval(payload: SubmitApprovalInput): Promise<ApprovalInstanceDto> {
    return this.request<ApprovalInstanceDto>("/api/approvals/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async recordDecision(
    id: string,
    payload: RecordApprovalDecisionInput,
  ): Promise<ApprovalInstanceDto> {
    return this.request<ApprovalInstanceDto>(`/api/approvals/${id}/decisions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const approvalsApi = new ApprovalsApi();
