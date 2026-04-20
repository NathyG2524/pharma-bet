import type {
  CreatePoPendingBranchApprovalNotificationInput,
  NotificationDispatchResult,
  NotificationDto,
} from "../types/notification";

export class NotificationsApi {
  private apiBaseUrl: string | null = null;
  private getAuthHeaders?: () => Record<string, string>;

  configure(options: { apiBaseUrl?: string; getAuthHeaders?: () => Record<string, string> }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
    this.getAuthHeaders = options.getAuthHeaders;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Notifications API not configured (apiBaseUrl required)");
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

  async listNotifications(): Promise<NotificationDto[]> {
    return this.request<NotificationDto[]>("/api/notifications");
  }

  async markNotificationRead(id: string): Promise<NotificationDto> {
    return this.request<NotificationDto>(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
  }

  async notifyPoPendingBranchApproval(
    dto: CreatePoPendingBranchApprovalNotificationInput,
  ): Promise<NotificationDispatchResult> {
    return this.request<NotificationDispatchResult>(
      "/api/notifications/po-pending-branch-approval",
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  }
}

export const notificationsApi = new NotificationsApi();
