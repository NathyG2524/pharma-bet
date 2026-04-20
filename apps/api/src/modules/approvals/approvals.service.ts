import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import {
  type ApprovalDecision,
  ApprovalInstance,
  type ApprovalLane,
  type ApprovalStatus,
} from "../../entities/approval-instance.entity";
import { Branch } from "../../entities/branch.entity";
import { TenantApprovalPolicy } from "../../entities/tenant-approval-policy.entity";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { RecordApprovalDecisionDto } from "./dto/record-approval-decision.dto";
import type { SubmitApprovalDto } from "./dto/submit-approval.dto";
import type { UpdateApprovalPolicyDto } from "./dto/update-approval-policy.dto";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BM_ROLE = UserRole.BRANCH_MANAGER;
const COMBINED_PATHS = new Set(["combined_hq_single_branch", "combined_hq_bm_unavailable"]);

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalInstance)
    private readonly approvalRepo: Repository<ApprovalInstance>,
    @InjectRepository(TenantApprovalPolicy)
    private readonly policyRepo: Repository<TenantApprovalPolicy>,
    @InjectRepository(UserMembership)
    private readonly membershipRepo: Repository<UserMembership>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  private requireScope(context: AuthContext) {
    if (!context.tenantId || !context.userId) {
      throw new UnauthorizedException("Approval actions require tenant and user context");
    }
    return { tenantId: context.tenantId, userId: context.userId };
  }

  private isHq(context: AuthContext): boolean {
    return context.roles.some((role) => HQ_ROLES.includes(role));
  }

  private isBranchManager(context: AuthContext): boolean {
    return context.roles.includes(BM_ROLE);
  }

  private isCombinedPath(path: string | null): boolean {
    return !!path && COMBINED_PATHS.has(path);
  }

  private async getOrCreatePolicy(tenantId: string): Promise<TenantApprovalPolicy> {
    const existing = await this.policyRepo.findOne({ where: { tenantId } });
    if (existing) {
      return existing;
    }
    return this.policyRepo.save(
      this.policyRepo.create({
        tenantId,
        allowHqBreakGlass: false,
        allowCombinedHqForSingleBranch: false,
        allowCombinedHqWhenBmUnavailable: false,
      }),
    );
  }

  private isBreakGlassActive(approval: ApprovalInstance): boolean {
    return !!approval.breakGlassReason && !!approval.breakGlassExpiresAt;
  }

  async list(context: AuthContext, domainType?: string, domainId?: string) {
    const scope = this.requireScope(context);
    const where = {
      tenantId: scope.tenantId,
      ...(domainType ? { domainType: domainType.trim() } : {}),
      ...(domainId ? { domainId: domainId.trim() } : {}),
    };
    return this.approvalRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async submitApproval(context: AuthContext, dto: SubmitApprovalDto): Promise<ApprovalInstance> {
    const scope = this.requireScope(context);
    const policy = await this.getOrCreatePolicy(scope.tenantId);

    let breakGlassReason: string | null = null;
    let breakGlassExpiresAt: Date | null = null;
    if (dto.breakGlass) {
      if (!policy.allowHqBreakGlass) {
        throw new BadRequestException("Break-glass approvals are disabled for this tenant");
      }
      breakGlassReason = dto.breakGlass.reason.trim();
      breakGlassExpiresAt = new Date(dto.breakGlass.expiresAt);
      if (Number.isNaN(breakGlassExpiresAt.getTime()) || breakGlassExpiresAt <= new Date()) {
        throw new BadRequestException("Break-glass expiresAt must be a future timestamp");
      }
    }

    const approval = await this.approvalRepo.save(
      this.approvalRepo.create({
        tenantId: scope.tenantId,
        branchId: dto.branchId?.trim() || null,
        domainType: dto.domainType.trim(),
        domainId: dto.domainId.trim(),
        requestedByUserId: scope.userId,
        status: "pending",
        bmDelegateUserId: dto.bmDelegateUserId?.trim() || null,
        bmUnavailable: dto.bmUnavailable ?? false,
        breakGlassReason,
        breakGlassExpiresAt,
        approvalPath: {},
      }),
    );

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "approval.submitted",
      entityType: "approval_instance",
      entityId: approval.id,
      metadata: {
        domainType: approval.domainType,
        domainId: approval.domainId,
        branchId: approval.branchId,
        approval_path: approval.approvalPath,
      },
    });

    const hqMemberships = await this.membershipRepo.find({
      where: {
        tenantId: scope.tenantId,
        role: In(HQ_ROLES),
      },
      select: ["userId"],
    });
    const bmMemberships = approval.branchId
      ? await this.membershipRepo.find({
          where: {
            tenantId: scope.tenantId,
            branchId: approval.branchId,
            role: BM_ROLE,
          },
          select: ["userId"],
        })
      : [];
    const recipientUserIds = Array.from(
      new Set([...hqMemberships.map((m) => m.userId), ...bmMemberships.map((m) => m.userId)]),
    );
    await this.notificationsService.notifyApprovalStateChange(context, {
      branchId: approval.branchId,
      recipientUserIds,
      title: "Approval requested",
      body: `${approval.domainType} ${approval.domainId} is awaiting BM + HQ approval.`,
      link: `/approvals/${approval.id}`,
      eventType: "approval_requested",
      eventKey: `approval:${approval.id}:submitted`,
    });

    return approval;
  }

  async evaluatePolicy(
    context: AuthContext,
    approval: ApprovalInstance,
    lane: ApprovalLane,
  ): Promise<string> {
    const scope = this.requireScope(context);
    const policy = await this.getOrCreatePolicy(scope.tenantId);

    if (lane === "hq") {
      if (!this.isHq(context)) {
        throw new ForbiddenException("HQ role required for HQ approval");
      }
      if (
        approval.bmApproverUserId === scope.userId &&
        !this.isCombinedPath(approval.bmDecisionPath ?? null)
      ) {
        throw new ForbiddenException("BM and HQ decisions must be separated unless exception path");
      }
      return this.isCombinedPath(approval.bmDecisionPath ?? null)
        ? (approval.bmDecisionPath ?? "standard_hq")
        : "standard_hq";
    }

    if (approval.hqApproverUserId === scope.userId) {
      throw new ForbiddenException("BM and HQ decisions must be separated unless exception path");
    }

    if (
      this.isBranchManager(context) &&
      approval.branchId &&
      context.activeBranchId === approval.branchId &&
      context.branchIds.includes(approval.branchId)
    ) {
      return "standard_bm";
    }

    if (approval.bmDelegateUserId && approval.bmDelegateUserId === scope.userId) {
      return "delegated_bm";
    }

    if (!this.isHq(context)) {
      throw new ForbiddenException("Branch manager or permitted delegate required for BM approval");
    }

    if (policy.allowHqBreakGlass && this.isBreakGlassActive(approval)) {
      if (!approval.breakGlassExpiresAt || approval.breakGlassExpiresAt < new Date()) {
        throw new ForbiddenException("Break-glass window is not active");
      }
      return "break_glass_hq";
    }

    if (policy.allowCombinedHqForSingleBranch) {
      const branchCount = await this.branchRepo.count({ where: { tenantId: scope.tenantId } });
      if (branchCount === 1) {
        return "combined_hq_single_branch";
      }
    }

    if (policy.allowCombinedHqWhenBmUnavailable && approval.bmUnavailable) {
      return "combined_hq_bm_unavailable";
    }

    throw new ForbiddenException("BM approval path not permitted by current tenant policy");
  }

  async recordDecision(
    context: AuthContext,
    approvalId: string,
    dto: RecordApprovalDecisionDto,
  ): Promise<ApprovalInstance> {
    const scope = this.requireScope(context);
    const approval = await this.approvalRepo.findOne({
      where: { id: approvalId, tenantId: scope.tenantId },
    });
    if (!approval) {
      throw new NotFoundException("Approval not found");
    }
    if (approval.status !== "pending") {
      throw new BadRequestException("Approval is already finalized");
    }

    const path = await this.evaluatePolicy(context, approval, dto.lane);
    const now = new Date();
    const reason = dto.reason?.trim() || null;
    if (dto.lane === "bm") {
      if (approval.bmDecision) {
        throw new BadRequestException("BM decision is already recorded");
      }
      approval.bmApproverUserId = scope.userId;
      approval.bmDecision = dto.decision;
      approval.bmDecisionReason = reason;
      approval.bmDecisionPath = path;
      approval.bmDecidedAt = now;
    } else {
      if (approval.hqDecision) {
        throw new BadRequestException("HQ decision is already recorded");
      }
      approval.hqApproverUserId = scope.userId;
      approval.hqDecision = dto.decision;
      approval.hqDecisionReason = reason;
      approval.hqDecisionPath = path;
      approval.hqDecidedAt = now;
    }

    const statusBefore = approval.status;
    if (approval.bmDecision === "rejected" || approval.hqDecision === "rejected") {
      approval.status = "rejected";
    } else if (approval.bmDecision === "approved" && approval.hqDecision === "approved") {
      approval.status = "approved";
    } else {
      approval.status = "pending";
    }

    approval.approvalPath = {
      bm: approval.bmDecisionPath,
      hq: approval.hqDecisionPath,
      usesCombinedPath: this.isCombinedPath(approval.bmDecisionPath),
    };

    const saved = await this.approvalRepo.save(approval);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "approval.decision_recorded",
      entityType: "approval_instance",
      entityId: saved.id,
      metadata: {
        lane: dto.lane,
        decision: dto.decision,
        status: saved.status,
        approval_path: saved.approvalPath,
      },
    });

    if (statusBefore !== saved.status) {
      await this.auditEventsService.recordEvent({
        tenantId: scope.tenantId,
        actorUserId: scope.userId,
        action: `approval.${saved.status}`,
        entityType: "approval_instance",
        entityId: saved.id,
        metadata: {
          approval_path: saved.approvalPath,
        },
      });
    }

    await this.notificationsService.notifyApprovalStateChange(context, {
      branchId: saved.branchId,
      recipientUserIds: [saved.requestedByUserId],
      title: `Approval ${saved.status}`,
      body: `${saved.domainType} ${saved.domainId} is now ${saved.status}.`,
      link: `/approvals/${saved.id}`,
      eventType: "approval_state_changed",
      eventKey: `approval:${saved.id}:state:${saved.status}:${saved.updatedAt.toISOString()}`,
    });

    return saved;
  }

  async getTenantPolicy(context: AuthContext): Promise<TenantApprovalPolicy> {
    const scope = this.requireScope(context);
    return this.getOrCreatePolicy(scope.tenantId);
  }

  async updateTenantPolicy(
    context: AuthContext,
    dto: UpdateApprovalPolicyDto,
  ): Promise<TenantApprovalPolicy> {
    if (
      !context.roles.includes(UserRole.HQ_ADMIN) &&
      !context.roles.includes(UserRole.PLATFORM_ADMIN)
    ) {
      throw new ForbiddenException("HQ admin role required to update approval policy");
    }
    const scope = this.requireScope(context);
    const current = await this.getOrCreatePolicy(scope.tenantId);
    if (dto.allowHqBreakGlass !== undefined) {
      current.allowHqBreakGlass = dto.allowHqBreakGlass;
    }
    if (dto.allowCombinedHqForSingleBranch !== undefined) {
      current.allowCombinedHqForSingleBranch = dto.allowCombinedHqForSingleBranch;
    }
    if (dto.allowCombinedHqWhenBmUnavailable !== undefined) {
      current.allowCombinedHqWhenBmUnavailable = dto.allowCombinedHqWhenBmUnavailable;
    }
    return this.policyRepo.save(current);
  }

  async findOne(context: AuthContext, approvalId: string): Promise<ApprovalInstance> {
    const scope = this.requireScope(context);
    const approval = await this.approvalRepo.findOne({
      where: { id: approvalId, tenantId: scope.tenantId },
    });
    if (!approval) {
      throw new NotFoundException("Approval not found");
    }
    return approval;
  }

  getStatus(approval: ApprovalInstance): ApprovalStatus {
    return approval.status;
  }
}
