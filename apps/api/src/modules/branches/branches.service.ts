import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, MoreThan, Not, type Repository } from "typeorm";
import { Branch } from "../../entities/branch.entity";
import { Invite } from "../../entities/invite.entity";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { AssignMembershipDto } from "./dto/assign-membership.dto";
import type { CreateBranchInviteDto } from "./dto/create-branch-invite.dto";
import type { CreateBranchDto } from "./dto/create-branch.dto";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BRANCH_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];
const BRANCH_INVITE_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];
const DEFAULT_INVITE_TTL_HOURS = 72;

export type PendingBranchInviteSummary = {
  id: string;
  tenantId: string;
  branchId: string;
  email: string;
  role: UserRole.BRANCH_MANAGER | UserRole.BRANCH_USER;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
};

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(UserMembership)
    private readonly membershipRepo: Repository<UserMembership>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
  ) {}

  async listForUser(context: AuthContext): Promise<Branch[]> {
    if (context.roles.some((role) => HQ_ROLES.includes(role))) {
      return this.branchRepo.find({
        where: { tenantId: context.tenantId },
        order: { name: "ASC" },
      });
    }
    if (!context.branchIds.length) {
      return [];
    }
    return this.branchRepo.find({
      where: { id: In(context.branchIds), tenantId: context.tenantId },
      order: { name: "ASC" },
    });
  }

  async createBranch(context: AuthContext, dto: CreateBranchDto): Promise<Branch> {
    const name = dto.name.trim();
    const exists = await this.branchRepo.exists({ where: { tenantId: context.tenantId, name } });
    if (exists) {
      throw new ConflictException("Branch name already exists");
    }
    const branch = this.branchRepo.create({
      tenantId: context.tenantId,
      name,
      code: dto.code?.trim() || null,
    });
    const savedBranch = await this.branchRepo.save(branch);
    await this.auditEventsService.recordEvent({
      tenantId: context.tenantId ?? "",
      actorUserId: context.userId ?? "unknown",
      action: "branch.created",
      entityType: "branch",
      entityId: savedBranch.id,
      metadata: {
        name: savedBranch.name,
        code: savedBranch.code ?? null,
      },
    });
    return savedBranch;
  }

  async assignMembership(context: AuthContext, dto: AssignMembershipDto): Promise<UserMembership> {
    const userId = dto.userId.trim();
    const role = dto.role;
    const branchId = dto.branchId ?? null;

    const isBranchRole = BRANCH_ROLES.includes(role);
    if (isBranchRole && !branchId) {
      throw new BadRequestException("Branch role requires branchId");
    }
    if (!isBranchRole && branchId) {
      throw new BadRequestException("HQ roles should not target a branch");
    }

    if (branchId) {
      const branch = await this.branchRepo.findOne({
        where: { id: branchId, tenantId: context.tenantId },
      });
      if (!branch) {
        throw new NotFoundException("Branch not found for tenant");
      }
    }

    const exists = await this.membershipRepo.exists({
      where: {
        tenantId: context.tenantId,
        userId,
        branchId: branchId ?? IsNull(),
        role,
      },
    });
    if (exists) {
      throw new ConflictException("Membership already exists");
    }

    const membership = this.membershipRepo.create({
      tenantId: context.tenantId,
      branchId,
      userId,
      role,
    });
    const savedMembership = await this.membershipRepo.save(membership);
    await this.auditEventsService.recordEvent({
      tenantId: context.tenantId ?? "",
      actorUserId: context.userId ?? "unknown",
      action: "membership.assigned",
      entityType: "membership",
      entityId: savedMembership.id,
      metadata: {
        userId: savedMembership.userId,
        role: savedMembership.role,
        branchId: savedMembership.branchId ?? null,
      },
    });
    return savedMembership;
  }

  async createBranchInvite(
    context: AuthContext,
    dto: CreateBranchInviteDto,
  ): Promise<{ invite: PendingBranchInviteSummary; url: string }> {
    if (!context.tenantId) {
      throw new BadRequestException("Tenant context is required");
    }
    const role = dto.role === "branch_manager" ? UserRole.BRANCH_MANAGER : UserRole.BRANCH_USER;
    if (!BRANCH_INVITE_ROLES.includes(role)) {
      throw new BadRequestException("Only branch_manager and branch_user invites are allowed");
    }

    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: context.tenantId },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found for this organization");
    }

    const email = dto.email.trim().toLowerCase();
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const parsedInviteTtlHours = Number.parseInt(process.env.INVITE_TTL_HOURS ?? "", 10);
    const inviteTtlHours =
      Number.isInteger(parsedInviteTtlHours) && parsedInviteTtlHours > 0
        ? parsedInviteTtlHours
        : DEFAULT_INVITE_TTL_HOURS;
    const expiresAt = new Date(Date.now() + inviteTtlHours * 60 * 60 * 1000);

    const invite = await this.inviteRepo.save(
      this.inviteRepo.create({
        tenantId: context.tenantId,
        branchId: branch.id,
        email,
        tokenHash,
        role,
        expiresAt,
        consumedAt: null,
        revokedAt: null,
        createdByUserId: context.userId ?? null,
      }),
    );

    const baseUrl = (process.env.BASE_URL ?? "").trim().replace(/\/$/, "");
    if (!baseUrl) {
      throw new InternalServerErrorException("BASE_URL must be configured for invite links");
    }
    const invitePath = `/invite/${token}`;
    const inviteUrl = `${baseUrl}${invitePath}`;

    await this.auditEventsService.recordEvent({
      tenantId: context.tenantId,
      actorUserId: context.userId ?? "unknown",
      action: "invite.created",
      entityType: "invite",
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role,
        branchId: invite.branchId,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });

    return {
      invite: {
        id: invite.id,
        tenantId: invite.tenantId,
        branchId: invite.branchId as string,
        email: invite.email,
        role: role as UserRole.BRANCH_MANAGER | UserRole.BRANCH_USER,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
        revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
      },
      url: inviteUrl,
    };
  }

  async listPendingBranchInvites(context: AuthContext): Promise<PendingBranchInviteSummary[]> {
    if (!context.tenantId) {
      throw new BadRequestException("Tenant context is required");
    }
    const invites = await this.inviteRepo.find({
      where: {
        tenantId: context.tenantId,
        branchId: Not(IsNull()),
        role: In([UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER]),
        consumedAt: IsNull(),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: "DESC" },
    });
    return invites.map((invite) => ({
      id: invite.id,
      tenantId: invite.tenantId,
      branchId: invite.branchId as string,
      email: invite.email,
      role: invite.role as UserRole.BRANCH_MANAGER | UserRole.BRANCH_USER,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
    }));
  }

  async revokeBranchInvite(
    context: AuthContext,
    inviteId: string,
  ): Promise<PendingBranchInviteSummary> {
    if (!context.tenantId) {
      throw new BadRequestException("Tenant context is required");
    }
    const invite = await this.inviteRepo.findOne({
      where: {
        id: inviteId,
        tenantId: context.tenantId,
        branchId: Not(IsNull()),
        role: In([UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER]),
      },
    });
    if (!invite) {
      throw new NotFoundException("Invite not found");
    }
    if (!invite.revokedAt) {
      invite.revokedAt = new Date();
      await this.inviteRepo.save(invite);
      await this.auditEventsService.recordEvent({
        tenantId: invite.tenantId,
        actorUserId: context.userId ?? "unknown",
        action: "invite.revoked",
        entityType: "invite",
        entityId: invite.id,
        metadata: {
          email: invite.email,
          role: invite.role,
          branchId: invite.branchId,
        },
      });
    }
    return {
      id: invite.id,
      tenantId: invite.tenantId,
      branchId: invite.branchId as string,
      email: invite.email,
      role: invite.role as UserRole.BRANCH_MANAGER | UserRole.BRANCH_USER,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
    };
  }
}
