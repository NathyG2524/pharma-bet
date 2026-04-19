import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "./auth-context";

export const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
export const BRANCH_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];

export const isHqRole = (context: AuthContext) =>
  context.roles?.some((role) => HQ_ROLES.includes(role));
