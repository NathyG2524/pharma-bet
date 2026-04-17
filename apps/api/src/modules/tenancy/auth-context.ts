import type { Request } from "express";
import type { UserRole } from "../../entities/user-membership.entity";

export interface AuthContext {
  tenantId?: string;
  userId?: string;
  roles: UserRole[];
  branchIds: string[];
  activeBranchId?: string | null;
}

export type RequestWithAuth = Request & { authContext?: AuthContext };
