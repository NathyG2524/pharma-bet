import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { getJwtSecret } from "../auth/jwt-secret";
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
    let userId = req.header("x-user-id")?.trim();
    const authHeader = req.header("authorization");
    const bearer =
      authHeader?.startsWith("Bearer ") || authHeader?.startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;
    if (bearer) {
      try {
        const payload = jwt.verify(bearer, getJwtSecret()) as jwt.JwtPayload & {
          sub?: string;
        };
        if (typeof payload.sub === "string" && payload.sub.length > 0) {
          userId = payload.sub;
        }
      } catch {
        /* invalid or expired token — fall through to header user id */
      }
    }
    const tenantId = req.header("x-tenant-id")?.trim();
    const branchIdsHeader = req.header("x-branch-ids");
    const activeBranchId = req.header("x-active-branch-id")?.trim();

    const branchIds = parseCsv(branchIdsHeader);

    const authContext: AuthContext = {
      userId: userId || undefined,
      tenantId: tenantId || undefined,
      roles: [],
      branchIds,
      activeBranchId: activeBranchId || undefined,
    };

    (req as RequestWithAuth).authContext = authContext;
    next();
  }
}
