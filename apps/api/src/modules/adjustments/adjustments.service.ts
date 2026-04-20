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
import { InventoryAdjustment } from "../../entities/inventory-adjustment.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import {
  InventoryMovement,
  InventoryMovementReferenceType,
  InventoryMovementType,
} from "../../entities/inventory-movement.entity";
import { AuditEventsService } from "../audit-events/audit-events.service";
import { ApprovalsService } from "../approvals/approvals.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import type { SubmitAdjustmentForApprovalDto } from "./dto/submit-adjustment.dto";

@Injectable()
export class AdjustmentsService {
  constructor(
    @InjectRepository(InventoryAdjustment)
    private readonly adjustmentRepo: Repository<InventoryAdjustment>,
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

  async listAdjustments(context: AuthContext) {
    const scope = this.requireBranchScope(context);
    const items = await this.adjustmentRepo.find({
      where: { tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { lot: true, medicine: true },
      order: { createdAt: "DESC" },
    });
    return { items, total: items.length };
  }

  async getAdjustment(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const adj = await this.adjustmentRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { lot: true, medicine: true },
    });
    if (!adj) throw new NotFoundException(`Adjustment ${id} not found`);
    return adj;
  }

  async createAdjustment(context: AuthContext, dto: CreateAdjustmentDto) {
    const scope = this.requireBranchScope(context);
    if (dto.quantity === 0) {
      throw new BadRequestException("Adjustment quantity must not be zero");
    }
    const lot = await this.lotRepo.findOne({
      where: { id: dto.lotId, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!lot) throw new NotFoundException(`Lot ${dto.lotId} not found`);

    const adj = await this.adjustmentRepo.save(
      this.adjustmentRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        lotId: lot.id,
        medicineId: lot.medicineId,
        quantity: dto.quantity,
        reasonCode: dto.reasonCode,
        notes: dto.notes?.trim() ?? null,
        status: "draft",
        requestedByUserId: scope.userId,
        approvalInstanceId: null,
        postedAt: null,
        postedByUserId: null,
      }),
    );

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "adjustment.created",
      entityType: "inventory_adjustment",
      entityId: adj.id,
      metadata: {
        lotId: adj.lotId,
        medicineId: adj.medicineId,
        quantity: adj.quantity,
        reasonCode: adj.reasonCode,
      },
    });

    return adj;
  }

  async submitForApproval(
    context: AuthContext,
    id: string,
    dto: SubmitAdjustmentForApprovalDto,
  ) {
    const scope = this.requireBranchScope(context);
    const adj = await this.adjustmentRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!adj) throw new NotFoundException(`Adjustment ${id} not found`);
    if (adj.status !== "draft") {
      throw new BadRequestException("Only draft adjustments can be submitted for approval");
    }

    const approval = await this.approvalsService.submitApproval(context, {
      domainType: "adjustment",
      domainId: adj.id,
      branchId: scope.branchId,
      bmDelegateUserId: dto.bmDelegateUserId,
      bmUnavailable: dto.bmUnavailable,
    });

    adj.status = "pending_approval";
    adj.approvalInstanceId = approval.id;
    const saved = await this.adjustmentRepo.save(adj);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "adjustment.submitted_for_approval",
      entityType: "inventory_adjustment",
      entityId: saved.id,
      metadata: { approvalInstanceId: approval.id },
    });

    return saved;
  }

  async syncApprovalStatus(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const adj = await this.adjustmentRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!adj) throw new NotFoundException(`Adjustment ${id} not found`);
    if (!adj.approvalInstanceId) {
      throw new BadRequestException("Adjustment has no approval instance");
    }
    if (adj.status === "posted") {
      throw new BadRequestException("Adjustment is already posted");
    }

    const approval = await this.approvalsService.findOne(context, adj.approvalInstanceId);
    if (approval.status === "approved" && adj.status !== "approved") {
      adj.status = "approved";
      await this.adjustmentRepo.save(adj);
    } else if (approval.status === "rejected" && adj.status !== "rejected") {
      adj.status = "rejected";
      await this.adjustmentRepo.save(adj);
    }

    return adj;
  }

  async postAdjustment(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const adj = await this.adjustmentRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { lot: true },
    });
    if (!adj) throw new NotFoundException(`Adjustment ${id} not found`);

    if (adj.status === "posted") {
      throw new BadRequestException("Adjustment is already posted");
    }
    if (adj.status === "rejected") {
      throw new BadRequestException("Rejected adjustments cannot be posted");
    }

    // Re-check approval status from source of truth before posting
    if (adj.approvalInstanceId) {
      const approval = await this.approvalsService.findOne(context, adj.approvalInstanceId);
      if (approval.status === "rejected") {
        throw new BadRequestException("Rejected adjustments cannot be posted");
      }
      if (approval.status !== "approved") {
        throw new ForbiddenException(
          "Adjustment cannot be posted until fully approved (both BM and HQ)",
        );
      }
    } else if (adj.status !== "approved") {
      throw new ForbiddenException(
        "Adjustment cannot be posted until fully approved (both BM and HQ)",
      );
    }

    // Load the lot (may not be eagerly loaded if adj was fetched without relations)
    const lot = adj.lot ?? await this.lotRepo.findOne({
      where: { id: adj.lotId, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!lot) throw new NotFoundException(`Lot ${adj.lotId} not found`);
    const newQty = lot.quantityOnHand + adj.quantity;
    if (newQty < 0) {
      throw new BadRequestException(
        `Cannot decrease lot below zero: current ${lot.quantityOnHand}, adjustment ${adj.quantity}`,
      );
    }
    lot.quantityOnHand = newQty;
    await this.lotRepo.save(lot);

    // Record movement
    await this.movementRepo.save(
      this.movementRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId: adj.medicineId,
        lotId: adj.lotId,
        type: InventoryMovementType.ADJUSTMENT,
        referenceType: InventoryMovementReferenceType.INVENTORY_ADJUSTMENT,
        referenceId: adj.id,
        quantity: adj.quantity,
        unitCost: lot.unitCost,
      }),
    );

    const now = new Date();
    adj.status = "posted";
    adj.postedAt = now;
    adj.postedByUserId = scope.userId;
    const saved = await this.adjustmentRepo.save(adj);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "adjustment.posted",
      entityType: "inventory_adjustment",
      entityId: saved.id,
      metadata: {
        lotId: adj.lotId,
        medicineId: adj.medicineId,
        quantity: adj.quantity,
        newQuantityOnHand: newQty,
      },
    });

    return saved;
  }
}
