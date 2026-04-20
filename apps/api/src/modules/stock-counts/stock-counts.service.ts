import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import {
  InventoryMovement,
  InventoryMovementReferenceType,
  InventoryMovementType,
} from "../../entities/inventory-movement.entity";
import { StockCountSession } from "../../entities/stock-count-session.entity";
import { StockCountVariance } from "../../entities/stock-count-variance.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import { ApprovalsService } from "../approvals/approvals.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreateStockCountSessionDto } from "./dto/create-session.dto";
import type { RecordVarianceDto } from "./dto/record-variance.dto";
import type { SubmitSessionDto } from "./dto/submit-session.dto";

@Injectable()
export class StockCountsService {
  constructor(
    @InjectRepository(StockCountSession)
    private readonly sessionRepo: Repository<StockCountSession>,
    @InjectRepository(StockCountVariance)
    private readonly varianceRepo: Repository<StockCountVariance>,
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
    @Inject(ApprovalsService)
    private readonly approvalsService: ApprovalsService,
  ) {}

  private requireBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    if (!context.userId) {
      throw new UnauthorizedException("User context required");
    }
    return {
      tenantId: context.tenantId,
      branchId: context.activeBranchId,
      userId: context.userId,
    };
  }

  async listSessions(context: AuthContext) {
    const scope = this.requireBranchScope(context);
    const items = await this.sessionRepo.find({
      where: { tenantId: scope.tenantId, branchId: scope.branchId },
      order: { createdAt: "DESC" },
    });
    return { items, total: items.length };
  }

  async getSession(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const session = await this.sessionRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { variances: { lot: true, medicine: true } },
    });
    if (!session) throw new NotFoundException(`Stock count session ${id} not found`);
    return session;
  }

  async createSession(context: AuthContext, dto: CreateStockCountSessionDto) {
    const scope = this.requireBranchScope(context);

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        status: "open",
        notes: dto.notes?.trim() ?? null,
        openedByUserId: scope.userId,
        approvalInstanceId: null,
      }),
    );

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "stock_count.session_created",
      entityType: "stock_count_session",
      entityId: session.id,
      metadata: { branchId: scope.branchId },
    });

    return session;
  }

  async recordVariance(context: AuthContext, sessionId: string, dto: RecordVarianceDto) {
    const scope = this.requireBranchScope(context);

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!session) throw new NotFoundException(`Stock count session ${sessionId} not found`);
    if (session.status !== "open") {
      throw new BadRequestException("Variances can only be recorded for open sessions");
    }

    const lot = await this.lotRepo.findOne({
      where: { id: dto.lotId, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!lot) throw new NotFoundException(`Lot ${dto.lotId} not found`);

    // Upsert: if a variance for this lot already exists in the session, update it
    const existing = await this.varianceRepo.findOne({
      where: { sessionId, lotId: dto.lotId },
    });

    const varianceQty = dto.countedQuantity - lot.quantityOnHand;

    if (existing) {
      existing.systemQuantity = lot.quantityOnHand;
      existing.countedQuantity = dto.countedQuantity;
      existing.varianceQuantity = varianceQty;
      existing.reasonCode = dto.reasonCode;
      existing.notes = dto.notes?.trim() ?? null;
      const saved = await this.varianceRepo.save(existing);
      return saved;
    }

    const variance = await this.varianceRepo.save(
      this.varianceRepo.create({
        sessionId,
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        lotId: lot.id,
        medicineId: lot.medicineId,
        systemQuantity: lot.quantityOnHand,
        countedQuantity: dto.countedQuantity,
        varianceQuantity: varianceQty,
        reasonCode: dto.reasonCode,
        notes: dto.notes?.trim() ?? null,
      }),
    );

    return variance;
  }

  async submitSession(context: AuthContext, sessionId: string, dto: SubmitSessionDto) {
    const scope = this.requireBranchScope(context);

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { variances: true },
    });
    if (!session) throw new NotFoundException(`Stock count session ${sessionId} not found`);
    if (session.status !== "open") {
      throw new BadRequestException("Only open sessions can be submitted for approval");
    }
    if (!session.variances || session.variances.length === 0) {
      throw new BadRequestException(
        "Session must have at least one variance before submission",
      );
    }

    const approval = await this.approvalsService.submitApproval(context, {
      domainType: "stock_count",
      domainId: session.id,
      branchId: scope.branchId,
      bmDelegateUserId: dto.bmDelegateUserId,
      bmUnavailable: dto.bmUnavailable,
    });

    session.status = "submitted";
    session.approvalInstanceId = approval.id;
    session.submittedAt = new Date();
    const saved = await this.sessionRepo.save(session);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "stock_count.submitted_for_approval",
      entityType: "stock_count_session",
      entityId: saved.id,
      metadata: { approvalInstanceId: approval.id, varianceCount: session.variances.length },
    });

    return saved;
  }

  async syncApprovalStatus(context: AuthContext, sessionId: string) {
    const scope = this.requireBranchScope(context);
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!session) throw new NotFoundException(`Stock count session ${sessionId} not found`);
    if (!session.approvalInstanceId) {
      throw new BadRequestException("Session has no approval instance");
    }
    if (session.status === "posted") {
      throw new BadRequestException("Session is already posted");
    }

    const approval = await this.approvalsService.findOne(context, session.approvalInstanceId);
    if (approval.status === "approved" && session.status !== "approved") {
      session.status = "approved";
      await this.sessionRepo.save(session);
    } else if (approval.status === "rejected" && session.status !== "rejected") {
      session.status = "rejected";
      await this.sessionRepo.save(session);
    }

    return session;
  }

  async postSession(context: AuthContext, sessionId: string) {
    const scope = this.requireBranchScope(context);

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { variances: { lot: true } },
    });
    if (!session) throw new NotFoundException(`Stock count session ${sessionId} not found`);

    // Re-check approval status from source of truth before posting
    if (session.approvalInstanceId) {
      const approval = await this.approvalsService.findOne(context, session.approvalInstanceId);
      if (approval.status !== "approved") {
        throw new ForbiddenException(
          "Session cannot be posted until fully approved (both BM and HQ)",
        );
      }
    } else if (session.status !== "approved") {
      throw new ForbiddenException(
        "Session cannot be posted until fully approved (both BM and HQ)",
      );
    }

    if (session.status === "posted") {
      throw new BadRequestException("Session is already posted");
    }
    if (session.status === "rejected") {
      throw new BadRequestException("Rejected sessions cannot be posted");
    }

    const variances = session.variances ?? [];
    for (const variance of variances) {
      if (variance.varianceQuantity === 0) continue;
      const lot = variance.lot;
      const newQty = lot.quantityOnHand + variance.varianceQuantity;
      if (newQty < 0) {
        throw new BadRequestException(
          `Cannot apply variance for lot ${lot.id}: would result in negative on-hand (${newQty})`,
        );
      }
      lot.quantityOnHand = newQty;
      await this.lotRepo.save(lot);

      await this.movementRepo.save(
        this.movementRepo.create({
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId: variance.medicineId,
          lotId: variance.lotId,
          type: InventoryMovementType.STOCK_COUNT_VARIANCE,
          referenceType: InventoryMovementReferenceType.STOCK_COUNT_VARIANCE,
          referenceId: variance.id,
          quantity: variance.varianceQuantity,
          unitCost: lot.unitCost,
        }),
      );
    }

    const now = new Date();
    session.status = "posted";
    session.postedAt = now;
    session.postedByUserId = scope.userId;
    const saved = await this.sessionRepo.save(session);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "stock_count.posted",
      entityType: "stock_count_session",
      entityId: saved.id,
      metadata: { varianceCount: variances.length },
    });

    return saved;
  }
}
