import type { AuthResponseDto } from "../types/auth";

export class AuthApi {
  private apiBaseUrl: string | null = null;

  configure(options: { apiBaseUrl?: string }) {
    this.apiBaseUrl = options.apiBaseUrl ?? null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiBaseUrl) {
      throw new Error("Auth API not configured (apiBaseUrl required)");
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

  async register(body: { email: string; password: string }): Promise<AuthResponseDto> {
    return this.request<AuthResponseDto>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async login(body: { email: string; password: string }): Promise<AuthResponseDto> {
    return this.request<AuthResponseDto>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export const authApi = new AuthApi();
