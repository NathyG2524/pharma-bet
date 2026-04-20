import assert from "node:assert/strict";
import { test } from "node:test";
import type { Repository } from "typeorm";
import type { AuditEvent } from "../../entities/audit-event.entity";
import type { Branch } from "../../entities/branch.entity";
import type { UserMembership } from "../../entities/user-membership.entity";
import { UserRole } from "../../entities/user-membership.entity";
import { BranchesService } from "../branches/branches.service";
import type { AuditEventInput, AuditEventsService } from "./audit-events.service";

type BranchRepo = {
  exists: () => Promise<boolean>;
  create: (data: Partial<Branch>) => Branch;
  save: (data: Branch) => Promise<Branch>;
};

test("creates a single audit event when a branch is created", async () => {
  const branchRepo: BranchRepo = {
    exists: async () => false,
    create: (data) => data as Branch,
    save: async (data) => ({ ...data, id: "branch-123" }) as Branch,
  };
  const membershipRepo = {} as Repository<UserMembership>;
  const auditEvents: AuditEventInput[] = [];
  const auditEventsService = {
    recordEvent: async (input: AuditEventInput) => {
      auditEvents.push(input);
      return input as unknown as AuditEvent;
    },
  };
  const service = new BranchesService(
    branchRepo as Repository<Branch>,
    membershipRepo,
    auditEventsService as unknown as AuditEventsService,
  );

  const result = await service.createBranch(
    {
      tenantId: "tenant-1",
      userId: "admin-1",
      roles: [UserRole.HQ_ADMIN],
      branchIds: [],
    },
    { name: "Main Branch", code: "MAIN" },
  );

  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0].action, "branch.created");
  assert.equal(auditEvents[0].entityType, "branch");
  assert.equal(auditEvents[0].entityId, result.id);
  assert.equal(auditEvents[0].tenantId, "tenant-1");
  assert.equal(auditEvents[0].actorUserId, "admin-1");
});
