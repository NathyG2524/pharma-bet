import type { UserRole } from "@drug-store/shared";

export type DevAuthState = {
  userId: string;
  tenantId: string;
  roles: UserRole[];
  branchIds: string[];
  activeBranchId?: string | null;
};

const STORAGE_KEY = "pharma-dev-auth";

const defaultState: DevAuthState = {
  userId: "dev-user",
  tenantId: "",
  roles: ["hq_admin"],
  branchIds: [],
  activeBranchId: "",
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
    return {
      ...defaultState,
      ...parsed,
      roles: Array.isArray(parsed.roles) ? (parsed.roles as UserRole[]) : defaultState.roles,
      branchIds: Array.isArray(parsed.branchIds) ? parsed.branchIds : defaultState.branchIds,
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

export const buildAuthHeaders = (state: DevAuthState): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (state.userId) headers["x-user-id"] = state.userId;
  if (state.tenantId) headers["x-tenant-id"] = state.tenantId;
  if (state.activeBranchId) headers["x-active-branch-id"] = state.activeBranchId;
  if (state.roles?.length) headers["x-roles"] = state.roles.join(",");
  if (state.branchIds?.length) headers["x-branch-ids"] = state.branchIds.join(",");
  return headers;
};

export const getAuthHeaders = (): Record<string, string> => buildAuthHeaders(readAuthState());
