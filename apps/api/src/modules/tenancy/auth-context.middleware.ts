import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response } from "express";
import type { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext, RequestWithAuth } from "./auth-context";

const parseCsv = (value?: string | null) =>
  value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: () => void) {
    const userId = req.header("x-user-id")?.trim();
    const tenantId = req.header("x-tenant-id")?.trim();
    const rolesHeader = req.header("x-roles") ?? req.header("x-role");
    const branchIdsHeader = req.header("x-branch-ids");
    const activeBranchId = req.header("x-active-branch-id")?.trim();

    const roles = parseCsv(rolesHeader) as UserRole[];
    const branchIds = parseCsv(branchIdsHeader);

    const authContext: AuthContext = {
      userId: userId || undefined,
      tenantId: tenantId || undefined,
      roles,
      branchIds,
      activeBranchId: activeBranchId || undefined,
    };

    (req as RequestWithAuth).authContext = authContext;
    next();
  }
}
