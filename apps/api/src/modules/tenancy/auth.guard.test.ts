import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { DataSource } from "typeorm";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import { User } from "../../entities/user.entity";
import { AuthGuard } from "./auth.guard";

type TestRequest = {
  authContext: {
    userId?: string;
    tenantId?: string;
    roles: UserRole[];
    branchIds: string[];
    activeBranchId?: string;
  };
};

const createExecutionContext = (request: TestRequest): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
  }) as unknown as ExecutionContext;

const createGuard = (options: {
  allowTenantless?: boolean;
  user: Pick<User, "id" | "platformAdmin"> | null;
  memberships?: Array<Pick<UserMembership, "role" | "branchId">>;
}) => {
  const userRepo = {
    findOne: async () => options.user,
  };

  const membershipRepo = {
    find: async () => options.memberships ?? [],
  };

  const dataSource = {
    getRepository: (entity: unknown) => {
      if (entity === User) {
        return userRepo;
      }
      if (entity === UserMembership) {
        return membershipRepo;
      }
      throw new Error("Unexpected repository requested");
    },
  } as unknown as DataSource;

  const reflector = {
    getAllAndOverride: () => options.allowTenantless ?? false,
  } as unknown as Reflector;

  return new AuthGuard(reflector, dataSource);
};

describe("AuthGuard role resolution", () => {
  it("denies tenant access when only spoofed platform_admin role is provided", async () => {
    const guard = createGuard({
      user: { id: "user-1", platformAdmin: false },
      memberships: [],
    });

    const request = {
      authContext: {
        userId: "user-1",
        tenantId: "tenant-1",
        roles: [UserRole.PLATFORM_ADMIN],
        branchIds: [],
      },
    } as TestRequest;

    await assert.rejects(
      () => guard.canActivate(createExecutionContext(request)),
      ForbiddenException,
    );
  });

  it("allows tenant access when user is real platform admin even if header roles are spoofed", async () => {
    const guard = createGuard({
      user: { id: "user-1", platformAdmin: true },
      memberships: [],
    });

    const request = {
      authContext: {
        userId: "user-1",
        tenantId: "tenant-1",
        roles: [UserRole.HQ_USER],
        branchIds: [],
      },
    } as TestRequest;

    const result = await guard.canActivate(createExecutionContext(request));

    assert.equal(result, true);
    assert.deepEqual(request.authContext.roles, [UserRole.PLATFORM_ADMIN]);
  });

  it("clears spoofed roles for tenantless routes when user is not platform admin", async () => {
    const guard = createGuard({
      allowTenantless: true,
      user: { id: "user-1", platformAdmin: false },
    });

    const request = {
      authContext: {
        userId: "user-1",
        roles: [UserRole.PLATFORM_ADMIN],
        branchIds: ["branch-1"],
      },
    } as TestRequest;

    const result = await guard.canActivate(createExecutionContext(request));

    assert.equal(result, true);
    assert.deepEqual(request.authContext.roles, []);
    assert.deepEqual(request.authContext.branchIds, []);
  });

  it("rejects unknown user IDs even when userId is present in context", async () => {
    const guard = createGuard({
      user: null,
    });

    const request = {
      authContext: {
        userId: "missing-user",
        tenantId: "tenant-1",
        roles: [],
        branchIds: [],
      },
    } as TestRequest;

    await assert.rejects(
      () => guard.canActivate(createExecutionContext(request)),
      UnauthorizedException,
    );
  });
});
