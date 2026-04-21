import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Repository } from "typeorm";
import type { Branch } from "../../entities/branch.entity";
import type { Invite } from "../../entities/invite.entity";
import type { UserMembership } from "../../entities/user-membership.entity";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuditEventsService } from "../audit-events/audit-events.service";
import { BranchesService } from "./branches.service";

const hqContext = {
  tenantId: "tenant-1",
  userId: "hq-1",
  roles: [UserRole.HQ_ADMIN],
  branchIds: [],
};

describe("BranchesService branch invites", () => {
  const prevBase = process.env.BASE_URL;

  before(() => {
    process.env.BASE_URL = "http://localhost:3000";
  });

  after(() => {
    process.env.BASE_URL = prevBase;
  });

  it("rejects create when branch does not belong to tenant", async () => {
    const branchRepo = {
      findOne: async () => null,
    } as unknown as Repository<Branch>;
    const service = new BranchesService(
      branchRepo,
      {} as Repository<UserMembership>,
      {} as Repository<Invite>,
      { recordEvent: async () => undefined } as unknown as AuditEventsService,
    );
    await assert.rejects(
      () =>
        service.createBranchInvite(hqContext, {
          email: "x@y.com",
          branchId: "other-branch",
          role: "branch_user",
        }),
      NotFoundException,
    );
  });

  it("listPendingBranchInvites requires tenant context", async () => {
    const service = new BranchesService(
      {} as Repository<Branch>,
      {} as Repository<UserMembership>,
      {} as Repository<Invite>,
      { recordEvent: async () => undefined } as unknown as AuditEventsService,
    );
    await assert.rejects(
      () => service.listPendingBranchInvites({ ...hqContext, tenantId: undefined }),
      BadRequestException,
    );
  });

  it("creates branch invite and returns invite URL", async () => {
    const branchRepo = {
      findOne: async () =>
        ({
          id: "b1",
          tenantId: "tenant-1",
          name: "Main",
        }) as Branch,
    } as unknown as Repository<Branch>;
    const inviteRepo = {
      create: (data: Partial<Invite>) => data as Invite,
      save: async (inv: Invite) =>
        ({
          ...inv,
          id: "inv-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as Invite,
    } as unknown as Repository<Invite>;
    const service = new BranchesService(branchRepo, {} as Repository<UserMembership>, inviteRepo, {
      recordEvent: async () => undefined,
    } as unknown as AuditEventsService);
    const result = await service.createBranchInvite(hqContext, {
      email: "staff@example.com",
      branchId: "b1",
      role: "branch_user",
    });
    assert.match(result.url, /\/invite\/[0-9a-f]+$/);
    assert.equal(result.invite.email, "staff@example.com");
    assert.equal(result.invite.role, UserRole.BRANCH_USER);
    assert.equal(result.invite.branchId, "b1");
  });
});
