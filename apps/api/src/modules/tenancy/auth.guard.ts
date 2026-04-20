import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DataSource } from "typeorm";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import type { RequestWithAuth } from "./auth-context";
import { ALLOW_TENANTLESS_KEY } from "./auth.decorators";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const auth = request.authContext;
    if (!auth?.userId) {
      throw new UnauthorizedException("Missing user identity");
    }

    const allowTenantless = this.reflector.getAllAndOverride<boolean>(ALLOW_TENANTLESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!auth.tenantId) {
      if (allowTenantless) {
        const roles = auth.roles ?? [];
        const branchIds = auth.branchIds ?? [];
        request.authContext = {
          ...auth,
          roles,
          branchIds,
        };
        return true;
      }
      throw new UnauthorizedException("Missing tenant context");
    }

    const membershipRepo = this.dataSource.getRepository(UserMembership);
    const memberships = await membershipRepo.find({
      where: { tenantId: auth.tenantId, userId: auth.userId },
    });

    if (!memberships.length) {
      if (auth.roles?.includes(UserRole.PLATFORM_ADMIN)) {
        request.authContext = {
          ...auth,
          roles: [UserRole.PLATFORM_ADMIN],
          branchIds: [],
        };
        return true;
      }
      throw new ForbiddenException("User has no access to this tenant");
    }

    const roles = Array.from(
      new Set(
        memberships
          .map((membership) => membership.role)
          .concat(auth.roles?.includes(UserRole.PLATFORM_ADMIN) ? [UserRole.PLATFORM_ADMIN] : []),
      ),
    );
    const branchIds = Array.from(
      new Set(memberships.map((membership) => membership.branchId).filter(Boolean) as string[]),
    );

    request.authContext = {
      ...auth,
      roles,
      branchIds,
      activeBranchId: auth.activeBranchId ?? undefined,
    };

    return true;
  }
}
