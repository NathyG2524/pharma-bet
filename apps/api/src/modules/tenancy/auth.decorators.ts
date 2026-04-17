import {
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import type { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext, RequestWithAuth } from "./auth-context";

export const ROLES_KEY = "roles";
export const ALLOW_TENANTLESS_KEY = "allowTenantless";

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const AllowTenantless = () => SetMetadata(ALLOW_TENANTLESS_KEY, true);

export const AuthContextParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    if (!request.authContext) {
      throw new UnauthorizedException("Auth context not initialized");
    }
    return request.authContext;
  },
);
