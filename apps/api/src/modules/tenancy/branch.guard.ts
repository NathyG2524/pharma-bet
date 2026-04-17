import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { RequestWithAuth } from "./auth-context";

@Injectable()
export class BranchGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const auth = request.authContext;
    const activeBranchId = auth?.activeBranchId;
    if (!activeBranchId) {
      throw new ForbiddenException("Active branch is required");
    }
    if (!auth?.branchIds?.includes(activeBranchId)) {
      throw new ForbiddenException("User does not have access to this branch");
    }
    return true;
  }
}
