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
import { User } from "../../entities/user.entity";
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
    const usersRepo = this.dataSource.getRepository(User);
    const user = await usersRepo.findOne({
      where: { id: auth.userId },
      select: ["id", "platformAdmin"],
    });
    const isPlatformAdmin = user?.platformAdmin === true;
    const effectiveRoles = isPlatformAdmin ? [UserRole.PLATFORM_ADMIN] : [];

    if (!auth.tenantId) {
      if (allowTenantless) {
        const branchIds = auth.branchIds ?? [];
        request.authContext = {
          ...auth,
          roles: effectiveRoles,
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
      if (isPlatformAdmin) {
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
      new Set(memberships.map((membership) => membership.role).concat(effectiveRoles)),
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
