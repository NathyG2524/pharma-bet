import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Repository } from "typeorm";
import type { ApprovalInstance } from "../../entities/approval-instance.entity";
import type { Branch } from "../../entities/branch.entity";
import type { TenantApprovalPolicy } from "../../entities/tenant-approval-policy.entity";
import type { UserMembership } from "../../entities/user-membership.entity";
import { UserRole } from "../../entities/user-membership.entity";
import { ApprovalsService } from "./approvals.service";

const createService = (options?: {
  policy?: {
    allowHqBreakGlass: boolean;
    allowCombinedHqForSingleBranch: boolean;
    allowCombinedHqWhenBmUnavailable: boolean;
  };
  branchCount?: number;
}) => {
  const policy = {
    tenantId: "tenant-1",
    allowHqBreakGlass: options?.policy?.allowHqBreakGlass ?? false,
    allowCombinedHqForSingleBranch: options?.policy?.allowCombinedHqForSingleBranch ?? false,
    allowCombinedHqWhenBmUnavailable: options?.policy?.allowCombinedHqWhenBmUnavailable ?? false,
  };
  const policyRepo = {
    findOne: async () => policy,
    save: async (input: unknown) => input,
    create: (input: unknown) => input,
  };
  const branchRepo = {
    count: async () => options?.branchCount ?? 2,
  };
  const noopRepo = {
    findOne: async () => null,
    find: async () => [],
    save: async (input: unknown) => input,
    create: (input: unknown) => input,
  };
  const auditEventsService = { recordEvent: async () => undefined };
  const notificationsService = {
    notifyApprovalStateChange: async () => ({ created: 0, emailed: 0 }),
  };
  return new ApprovalsService(
    noopRepo as unknown as Repository<ApprovalInstance>,
    policyRepo as unknown as Repository<TenantApprovalPolicy>,
    noopRepo as unknown as Repository<UserMembership>,
    branchRepo as unknown as Repository<Branch>,
    auditEventsService as never,
    notificationsService as never,
  );
};

const baseApproval = (): ApprovalInstance =>
  ({
    id: "approval-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    domainType: "adjustment",
    domainId: "adj-1",
    requestedByUserId: "requester-1",
    status: "pending",
    bmDelegateUserId: null,
    bmUnavailable: false,
    breakGlassReason: null,
    breakGlassExpiresAt: null,
    bmApproverUserId: null,
    bmDecision: null,
    bmDecisionPath: null,
    bmDecisionReason: null,
    bmDecidedAt: null,
    hqApproverUserId: null,
    hqDecision: null,
    hqDecisionPath: null,
    hqDecisionReason: null,
    hqDecidedAt: null,
    approvalPath: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as ApprovalInstance;

describe("approval policy evaluation paths", () => {
  it("uses standard BM + HQ dual path with strict separation", async () => {
    const service = createService();
    const approval = baseApproval();
    const bmPath = await service.evaluatePolicy(
      {
        tenantId: "tenant-1",
        userId: "bm-1",
        roles: [UserRole.BRANCH_MANAGER],
        branchIds: ["branch-1"],
        activeBranchId: "branch-1",
      },
      approval,
      "bm",
    );
    assert.equal(bmPath, "standard_bm");

    approval.bmApproverUserId = "bm-1";
    approval.bmDecisionPath = "standard_bm";
    const hqPath = await service.evaluatePolicy(
      {
        tenantId: "tenant-1",
        userId: "hq-1",
        roles: [UserRole.HQ_ADMIN],
        branchIds: [],
      },
      approval,
      "hq",
    );
    assert.equal(hqPath, "standard_hq");
  });

  it("supports delegated BM path", async () => {
    const service = createService();
    const approval = baseApproval();
    approval.bmDelegateUserId = "delegate-1";
    const path = await service.evaluatePolicy(
      {
        tenantId: "tenant-1",
        userId: "delegate-1",
        roles: [UserRole.BRANCH_USER],
        branchIds: ["branch-1"],
        activeBranchId: "branch-1",
      },
      approval,
      "bm",
    );
    assert.equal(path, "delegated_bm");
  });

  it("supports HQ break-glass BM path inside active window", async () => {
    const service = createService({
      policy: {
        allowHqBreakGlass: true,
        allowCombinedHqForSingleBranch: false,
        allowCombinedHqWhenBmUnavailable: false,
      },
    });
    const approval = baseApproval();
    approval.breakGlassReason = "Manager unavailable during emergency dispatch";
    approval.breakGlassExpiresAt = new Date(Date.now() + 60_000);

    const path = await service.evaluatePolicy(
      {
        tenantId: "tenant-1",
        userId: "hq-1",
        roles: [UserRole.HQ_ADMIN],
        branchIds: [],
      },
      approval,
      "bm",
    );
    assert.equal(path, "break_glass_hq");
  });

  it("supports combined HQ exception for single-branch tenant", async () => {
    const service = createService({
      policy: {
        allowHqBreakGlass: false,
        allowCombinedHqForSingleBranch: true,
        allowCombinedHqWhenBmUnavailable: false,
      },
      branchCount: 1,
    });
    const approval = baseApproval();

    const bmPath = await service.evaluatePolicy(
      {
        tenantId: "tenant-1",
        userId: "hq-1",
        roles: [UserRole.HQ_ADMIN],
        branchIds: [],
      },
      approval,
      "bm",
    );
    assert.equal(bmPath, "combined_hq_single_branch");

    approval.bmApproverUserId = "hq-1";
    approval.bmDecisionPath = bmPath;
    const hqPath = await service.evaluatePolicy(
      {
        tenantId: "tenant-1",
        userId: "hq-1",
        roles: [UserRole.HQ_ADMIN],
        branchIds: [],
      },
      approval,
      "hq",
    );
    assert.equal(hqPath, "combined_hq_single_branch");
  });
});
