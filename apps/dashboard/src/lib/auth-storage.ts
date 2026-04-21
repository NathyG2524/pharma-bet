import type { UserRole } from "@drug-store/shared";

export type DevAuthState = {
  accessToken: string | null;
  userId: string;
  email?: string;
  tenantId: string;
  roles: UserRole[];
  branchIds: string[];
  activeBranchId?: string | null;
  /** False until user finishes /choose-tenant (tenant + optional branch). */
  onboardingComplete: boolean;
};

const STORAGE_KEY = "pharma-dev-auth";

const defaultState: DevAuthState = {
  accessToken: null,
  userId: "",
  email: undefined,
  tenantId: "",
  roles: [],
  branchIds: [],
  activeBranchId: null,
  onboardingComplete: true,
};

export const readAuthState = (): DevAuthState => {
  if (typeof window === "undefined") {
    return defaultState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }
    const parsed = JSON.parse(raw) as Partial<DevAuthState>;
    const normalizedActiveBranchId =
      typeof parsed.activeBranchId === "string"
        ? parsed.activeBranchId.trim() || null
        : (parsed.activeBranchId ?? defaultState.activeBranchId);
    const accessToken =
      typeof parsed.accessToken === "string" && parsed.accessToken.length > 0
        ? parsed.accessToken
        : null;
    const hasLegacyTenant =
      typeof parsed.tenantId === "string" && parsed.tenantId.trim().length > 0;
    const onboardingComplete =
      typeof parsed.onboardingComplete === "boolean"
        ? parsed.onboardingComplete
        : hasLegacyTenant;
    return {
      ...defaultState,
      ...parsed,
      accessToken,
      roles: Array.isArray(parsed.roles) ? (parsed.roles as UserRole[]) : defaultState.roles,
      branchIds: Array.isArray(parsed.branchIds) ? parsed.branchIds : defaultState.branchIds,
      activeBranchId: normalizedActiveBranchId,
      onboardingComplete,
    };
  } catch {
    return defaultState;
  }
};

export const writeAuthState = (state: DevAuthState) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearAuthSession = (): DevAuthState => ({ ...defaultState });

export const buildAuthHeaders = (state: DevAuthState): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (state.accessToken) {
    headers.Authorization = `Bearer ${state.accessToken}`;
  } else if (state.userId) {
    headers["x-user-id"] = state.userId;
  }
  if (state.tenantId) headers["x-tenant-id"] = state.tenantId;
  if (state.activeBranchId) headers["x-active-branch-id"] = state.activeBranchId;
  if (state.roles?.length) headers["x-roles"] = state.roles.join(",");
  if (state.branchIds?.length) headers["x-branch-ids"] = state.branchIds.join(",");
  return headers;
};

export const getAuthHeaders = (): Record<string, string> => buildAuthHeaders(readAuthState());
