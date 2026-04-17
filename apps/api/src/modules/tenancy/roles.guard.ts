import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RequestWithAuth } from "./auth-context";
import { ROLES_KEY } from "./auth.decorators";
import type { UserRole } from "../../entities/user-membership.entity";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const roles = request.authContext?.roles ?? [];
    const allowed = requiredRoles.some((role) => roles.includes(role));
    if (!allowed) {
      throw new ForbiddenException("Insufficient role for this action");
    }
    return true;
  }
}
