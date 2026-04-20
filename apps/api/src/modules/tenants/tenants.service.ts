import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import { Tenant } from "../../entities/tenant.entity";
import { UserMembership, UserRole } from "../../entities/user-membership.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreateTenantDto } from "./dto/create-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
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

  async create(context: AuthContext, dto: CreateTenantDto): Promise<Tenant> {
    const name = dto.name.trim();
    const exists = await this.tenantRepo.exists({ where: { name } });
    if (exists) {
      throw new ConflictException("Tenant name already exists");
    }
    const tenant = await this.tenantRepo.save(this.tenantRepo.create({ name }));
    const hqAdminUserId = dto.hqAdminUserId?.trim() || context.userId;
    if (hqAdminUserId) {
      await this.membershipRepo.save(
        this.membershipRepo.create({
          tenantId: tenant.id,
          branchId: null,
          userId: hqAdminUserId,
          role: UserRole.HQ_ADMIN,
        }),
      );
    }
    await this.auditEventsService.recordEvent({
      tenantId: tenant.id,
      actorUserId: context.userId ?? "unknown",
      action: "tenant.created",
      entityType: "tenant",
      entityId: tenant.id,
      metadata: {
        name: tenant.name,
        hqAdminUserId: hqAdminUserId ?? null,
      },
    });
    return tenant;
  }
}
