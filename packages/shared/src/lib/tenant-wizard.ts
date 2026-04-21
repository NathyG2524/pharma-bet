import type { SessionTenantDto } from "../types/session";
import type { UserRole } from "../types/tenancy";

const HQ_WIDE_ROLES: UserRole[] = ["hq_admin", "hq_user", "platform_admin"];

export function tenantHasHqWideAccess(tenant: SessionTenantDto, isPlatformAdmin: boolean): boolean {
  if (isPlatformAdmin) return true;
  return tenant.memberships.some((m) => HQ_WIDE_ROLES.includes(m.role));
}

export function distinctBranchIds(tenant: SessionTenantDto): string[] {
  return [...new Set(tenant.memberships.map((m) => m.branchId).filter(Boolean))] as string[];
}

/** Branch picker only when the user has more than one branch membership and no HQ-wide role. */
export function needsBranchSelectionStep(
  tenant: SessionTenantDto,
  isPlatformAdmin: boolean,
): boolean {
  if (tenantHasHqWideAccess(tenant, isPlatformAdmin)) {
    return false;
  }
  return distinctBranchIds(tenant).length > 1;
}

/** When exactly one branch membership, return that branch id. */
export function autoSelectBranchId(
  tenant: SessionTenantDto,
  isPlatformAdmin: boolean,
): string | null {
  if (tenantHasHqWideAccess(tenant, isPlatformAdmin)) {
    return null;
  }
  const ids = distinctBranchIds(tenant);
  if (ids.length === 1) return ids[0] ?? null;
  return null;
}

export function rolesForTenant(tenant: SessionTenantDto, isPlatformAdmin: boolean): UserRole[] {
  if (isPlatformAdmin) return ["platform_admin"];
  return [...new Set(tenant.memberships.map((m) => m.role))];
}

export function branchIdsForTenant(tenant: SessionTenantDto): string[] {
  return [...new Set(tenant.memberships.map((m) => m.branchId).filter(Boolean))] as string[];
}
