import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "node:crypto";
import { In, IsNull, MoreThan, type Repository } from "typeorm";
import { Invite } from "../../entities/invite.entity";
import { Tenant } from "../../entities/tenant.entity";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreateTenantDto } from "./dto/create-tenant.dto";

const DEFAULT_INVITE_TTL_HOURS = 72;

export type PendingHqInviteSummary = {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole.HQ_ADMIN;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
};

export type CreateTenantResult = {
  tenant: Tenant;
  invite: PendingHqInviteSummary & {
    url: string;
  };
};

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(UserMembership)
    private readonly membershipRepo: Repository<UserMembership>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
  ) {}

  async listForUser(context: AuthContext): Promise<Tenant[]> {
    if (context.roles.includes(UserRole.PLATFORM_ADMIN)) {
      return this.tenantRepo.find({ order: { name: "ASC" } });
    }

    const memberships = await this.membershipRepo.find({
      where: { userId: context.userId },
      select: ["tenantId"],
    });
    const tenantIds = Array.from(new Set(memberships.map((m) => m.tenantId)));
    if (!tenantIds.length) {
      return [];
    }
    return this.tenantRepo.find({ where: { id: In(tenantIds) }, order: { name: "ASC" } });
  }

  async create(context: AuthContext, dto: CreateTenantDto): Promise<CreateTenantResult> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("Tenant name is required");
    }
    const normalizedEmail = dto.hqAdminEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("HQ admin email is required");
    }
    const exists = await this.tenantRepo.exists({ where: { name } });
    if (exists) {
      throw new ConflictException("Tenant name already exists");
    }
    const tenant = await this.tenantRepo.save(this.tenantRepo.create({ name }));

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const inviteTtlHours = Number(process.env.INVITE_TTL_HOURS ?? DEFAULT_INVITE_TTL_HOURS);
    const expiresAt = new Date(Date.now() + inviteTtlHours * 60 * 60 * 1000);
    const invite = await this.inviteRepo.save(
      this.inviteRepo.create({
        tenantId: tenant.id,
        branchId: null,
        email: normalizedEmail,
        tokenHash,
        role: UserRole.HQ_ADMIN,
        expiresAt,
        consumedAt: null,
        revokedAt: null,
        createdByUserId: context.userId ?? null,
      }),
    );

    const baseUrl = (process.env.BASE_URL ?? "").trim().replace(/\/$/, "");
    const invitePath = `/invite/${token}`;
    const inviteUrl = baseUrl ? `${baseUrl}${invitePath}` : invitePath;

    await this.auditEventsService.recordEvent({
      tenantId: tenant.id,
      actorUserId: context.userId ?? "unknown",
      action: "tenant.created",
      entityType: "tenant",
      entityId: tenant.id,
      metadata: {
        name: tenant.name,
        hqAdminEmail: normalizedEmail,
      },
    });
    await this.auditEventsService.recordEvent({
      tenantId: tenant.id,
      actorUserId: context.userId ?? "unknown",
      action: "invite.created",
      entityType: "invite",
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
      },
    });

    return {
      tenant,
      invite: {
        id: invite.id,
        tenantId: invite.tenantId,
        email: invite.email,
        role: UserRole.HQ_ADMIN,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
        revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
        url: inviteUrl,
      },
    };
  }

  async listPendingHqInvites(tenantId?: string): Promise<PendingHqInviteSummary[]> {
    const whereClause = {
      role: UserRole.HQ_ADMIN,
      branchId: IsNull(),
      consumedAt: IsNull(),
      revokedAt: IsNull(),
      expiresAt: MoreThan(new Date()),
      ...(tenantId ? { tenantId } : {}),
    };
    const invites = await this.inviteRepo.find({
      where: whereClause,
      order: { createdAt: "DESC" },
    });
    return invites.map((invite) => ({
      id: invite.id,
      tenantId: invite.tenantId,
      email: invite.email,
      role: UserRole.HQ_ADMIN,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
    }));
  }

  async revokePendingHqInvite(context: AuthContext, inviteId: string): Promise<PendingHqInviteSummary> {
    const invite = await this.inviteRepo.findOne({
      where: {
        id: inviteId,
        role: UserRole.HQ_ADMIN,
        branchId: IsNull(),
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
        },
      });
    }
    return {
      id: invite.id,
      tenantId: invite.tenantId,
      email: invite.email,
      role: UserRole.HQ_ADMIN,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
    };
  }

  async resolveActiveHqInviteByToken(token: string): Promise<Invite | null> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return this.inviteRepo.findOne({
      where: {
        tokenHash,
        role: UserRole.HQ_ADMIN,
        branchId: IsNull(),
        consumedAt: IsNull(),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
  }
}
