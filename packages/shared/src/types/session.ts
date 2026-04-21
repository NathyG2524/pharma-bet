import type { UserRole } from "./tenancy";

export type SessionMembershipDto = {
  role: UserRole;
  branchId: string | null;
};

export type SessionTenantDto = {
  id: string;
  name: string;
  memberships: SessionMembershipDto[];
};

export type SessionBootstrapDto = {
  isPlatformAdmin: boolean;
  tenants: SessionTenantDto[];
};
