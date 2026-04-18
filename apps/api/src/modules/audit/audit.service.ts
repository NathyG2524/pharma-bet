import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { AuditEvent } from "../../entities/audit-event.entity";
import type { AuthContext } from "../tenancy/auth-context";

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async recordPatientEvent(
    context: AuthContext,
    action: string,
    patientId: string,
  ): Promise<AuditEvent> {
    if (!context.tenantId || !context.userId) {
      throw new NotFoundException("Audit context requires tenant and user");
    }
    const event = this.auditRepo.create({
      tenantId: context.tenantId,
      branchId: context.activeBranchId ?? null,
      userId: context.userId,
      action,
      patientId,
    });
    return this.auditRepo.save(event);
  }
}
