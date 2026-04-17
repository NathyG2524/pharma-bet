export type UserRole = "platform_admin" | "hq_admin" | "hq_user" | "branch_manager" | "branch_user";

export interface TenantDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDto {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipDto {
  id: string;
  tenantId: string;
  branchId: string | null;
  userId: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateTenantInput {
  name: string;
  hqAdminUserId?: string;
}

export interface CreateBranchInput {
  name: string;
  code?: string;
}

export interface AssignMembershipInput {
  userId: string;
  role: UserRole;
  branchId?: string | null;
}
