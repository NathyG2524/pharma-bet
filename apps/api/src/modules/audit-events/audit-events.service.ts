import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { AuditEvent } from "../../entities/audit-event.entity";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import type { ListAuditEventsDto } from "./dto/list-audit-events.dto";

export type AuditEventInput = {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export type AuditEventsListResponse = {
  items: AuditEvent[];
  page: number;
  pageSize: number;
  total: number;
};

@Injectable()
export class AuditEventsService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async recordEvent(input: AuditEventInput): Promise<AuditEvent> {
    const event = this.auditRepo.create({
      ...input,
      metadata: input.metadata ?? {},
    });
    return this.auditRepo.save(event);
  }

  async listForContext(
    context: AuthContext,
    query: ListAuditEventsDto,
  ): Promise<AuditEventsListResponse> {
    const tenantId =
      context.tenantId || (context.roles.includes(UserRole.PLATFORM_ADMIN) ? query.tenantId : null);
    if (!tenantId) {
      throw new BadRequestException("Tenant context is required to list audit events");
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.auditRepo.createQueryBuilder("audit").where("audit.tenantId = :tenantId", {
      tenantId,
    });

    if (query.actorUserId) {
      qb.andWhere("audit.actorUserId = :actorUserId", { actorUserId: query.actorUserId });
    }
    if (query.entityType) {
      qb.andWhere("audit.entityType = :entityType", { entityType: query.entityType });
    }
    if (query.startDate) {
      qb.andWhere("audit.createdAt >= :startDate", { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere("audit.createdAt <= :endDate", { endDate: query.endDate });
    }

    const [items, total] = await qb
      .orderBy("audit.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, page, pageSize, total };
  }
}
