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
import { SupplierReturnLine } from "../../entities/supplier-return-line.entity";
import { SupplierReturn } from "../../entities/supplier-return.entity";
import { UserRole } from "../../entities/user-membership.entity";
import { ApprovalsService } from "../approvals/approvals.service";
import { AuditEventsService } from "../audit-events/audit-events.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreateSupplierReturnDto } from "./dto/create-supplier-return.dto";
import type { HqConfirmSupplierReturnDto } from "./dto/hq-confirm-supplier-return.dto";
import type { SubmitSupplierReturnForApprovalDto } from "./dto/submit-supplier-return.dto";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];

@Injectable()
export class SupplierReturnsService {
  constructor(
    @InjectRepository(SupplierReturn)
    private readonly returnRepo: Repository<SupplierReturn>,
    @InjectRepository(SupplierReturnLine)
    private readonly lineRepo: Repository<SupplierReturnLine>,
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
    @Inject(ApprovalsService)
    private readonly approvalsService: ApprovalsService,
  ) {}

  private requireScope(context: AuthContext) {
    if (!context.tenantId || !context.userId) {
      throw new UnauthorizedException("Tenant and user context required");
    }
    return { tenantId: context.tenantId, userId: context.userId };
  }

  private requireBranchScope(context: AuthContext) {
    const scope = this.requireScope(context);
    if (!context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { ...scope, branchId: context.activeBranchId };
  }

  private isHq(context: AuthContext): boolean {
    return context.roles.some((role) => HQ_ROLES.includes(role as UserRole));
  }

  async list(context: AuthContext) {
    const scope = this.requireBranchScope(context);
    const items = await this.returnRepo.find({
      where: { tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { supplier: true, lines: { lot: true, medicine: true } },
      order: { createdAt: "DESC" },
    });
    return { items, total: items.length };
  }

  async getById(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const ret = await this.returnRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { supplier: true, lines: { lot: true, medicine: true } },
    });
    if (!ret) throw new NotFoundException(`Supplier return ${id} not found`);
    return ret;
  }

  async create(context: AuthContext, dto: CreateSupplierReturnDto) {
    const scope = this.requireBranchScope(context);

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("At least one return line is required");
    }

    // Validate all lots exist and belong to this branch
    for (const line of dto.lines) {
      const lot = await this.lotRepo.findOne({
        where: { id: line.lotId, tenantId: scope.tenantId, branchId: scope.branchId },
      });
      if (!lot) {
        throw new NotFoundException(`Lot ${line.lotId} not found in this branch`);
      }
    }

    const supplierReturn = await this.returnRepo.save(
      this.returnRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        supplierId: dto.supplierId,
        sourcePurchaseOrderId: dto.sourcePurchaseOrderId ?? null,
        sourceReceiptId: dto.sourceReceiptId ?? null,
        notes: dto.notes?.trim() ?? null,
        status: "draft",
        requestedByUserId: scope.userId,
        hqConfirmedByUserId: null,
        hqConfirmedAt: null,
        hqConfirmationNotes: null,
        approvalInstanceId: null,
        dispatchedAt: null,
        dispatchedByUserId: null,
      }),
    );

    // Create lines
    for (const lineDto of dto.lines) {
      const lot = await this.lotRepo.findOne({
        where: { id: lineDto.lotId, tenantId: scope.tenantId, branchId: scope.branchId },
      });
      if (!lot) throw new NotFoundException(`Lot ${lineDto.lotId} not found`);
      await this.lineRepo.save(
        this.lineRepo.create({
          returnId: supplierReturn.id,
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          lotId: lot.id,
          medicineId: lot.medicineId,
          quantity: lineDto.quantity,
          notes: lineDto.notes?.trim() ?? null,
        }),
      );
    }

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "supplier_return.created",
      entityType: "supplier_return",
      entityId: supplierReturn.id,
      metadata: {
        supplierId: dto.supplierId,
        sourcePurchaseOrderId: dto.sourcePurchaseOrderId ?? null,
        sourceReceiptId: dto.sourceReceiptId ?? null,
        lineCount: dto.lines.length,
      },
    });

    return this.returnRepo.findOne({
      where: { id: supplierReturn.id },
      relations: { supplier: true, lines: { lot: true, medicine: true } },
    });
  }

  /** Submit a draft return for HQ confirmation */
  async submitForHqConfirmation(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const ret = await this.returnRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { lines: true },
    });
    if (!ret) throw new NotFoundException(`Supplier return ${id} not found`);
    if (ret.status !== "draft") {
      throw new BadRequestException("Only draft returns can be submitted for HQ confirmation");
    }
    if (!ret.lines || ret.lines.length === 0) {
      throw new BadRequestException("Return must have at least one line before submission");
    }

    ret.status = "pending_hq_confirmation";
    const saved = await this.returnRepo.save(ret);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "supplier_return.submitted_for_hq_confirmation",
      entityType: "supplier_return",
      entityId: saved.id,
      metadata: {},
    });

    return saved;
  }

  /** HQ confirms the return against the supplier relationship */
  async hqConfirm(context: AuthContext, id: string, dto: HqConfirmSupplierReturnDto) {
    const scope = this.requireScope(context);
    if (!this.isHq(context)) {
      throw new ForbiddenException("HQ role required to confirm supplier returns");
    }

    // HQ can confirm returns across branches – find by tenant only
    const ret = await this.returnRepo.findOne({
      where: { id, tenantId: scope.tenantId },
      relations: { lines: true },
    });
    if (!ret) throw new NotFoundException(`Supplier return ${id} not found`);
    if (ret.status !== "pending_hq_confirmation") {
      throw new BadRequestException(
        "Only returns in pending_hq_confirmation status can be confirmed by HQ",
      );
    }

    const now = new Date();
    ret.status = "hq_confirmed";
    ret.hqConfirmedByUserId = scope.userId;
    ret.hqConfirmedAt = now;
    ret.hqConfirmationNotes = dto.notes?.trim() ?? null;
    const saved = await this.returnRepo.save(ret);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "supplier_return.hq_confirmed",
      entityType: "supplier_return",
      entityId: saved.id,
      metadata: { hqConfirmationNotes: saved.hqConfirmationNotes },
    });

    return saved;
  }

  /** Submit HQ-confirmed return for dual (BM + HQ) approval */
  async submitForApproval(
    context: AuthContext,
    id: string,
    dto: SubmitSupplierReturnForApprovalDto,
  ) {
    const scope = this.requireBranchScope(context);
    const ret = await this.returnRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!ret) throw new NotFoundException(`Supplier return ${id} not found`);
    if (ret.status !== "hq_confirmed") {
      throw new BadRequestException(
        "Return must be HQ-confirmed before submitting for dual approval",
      );
    }

    const approval = await this.approvalsService.submitApproval(context, {
      domainType: "supplier_return",
      domainId: ret.id,
      branchId: scope.branchId,
      bmDelegateUserId: dto.bmDelegateUserId,
      bmUnavailable: dto.bmUnavailable,
    });

    ret.status = "pending_approval";
    ret.approvalInstanceId = approval.id;
    const saved = await this.returnRepo.save(ret);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "supplier_return.submitted_for_approval",
      entityType: "supplier_return",
      entityId: saved.id,
      metadata: { approvalInstanceId: approval.id },
    });

    return saved;
  }

  /** Sync approval status from the approval instance */
  async syncApprovalStatus(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const ret = await this.returnRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!ret) throw new NotFoundException(`Supplier return ${id} not found`);
    if (!ret.approvalInstanceId) {
      throw new BadRequestException("Return has no approval instance");
    }
    if (ret.status === "dispatched") {
      throw new BadRequestException("Return is already dispatched");
    }

    const approval = await this.approvalsService.findOne(context, ret.approvalInstanceId);
    if (approval.status === "approved" && ret.status !== "approved") {
      ret.status = "approved";
      await this.returnRepo.save(ret);
    } else if (approval.status === "rejected" && ret.status !== "rejected") {
      ret.status = "rejected";
      await this.returnRepo.save(ret);
    }

    return ret;
  }

  /**
   * Dispatch the return: validates both approvals are in place, then
   * decrements inventory lots and records movements. This is the
   * "stock leaves" milestone.
   */
  async dispatch(context: AuthContext, id: string) {
    const scope = this.requireBranchScope(context);
    const ret = await this.returnRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { lines: true },
    });
    if (!ret) throw new NotFoundException(`Supplier return ${id} not found`);

    if (ret.status === "dispatched") {
      throw new BadRequestException("Return is already dispatched");
    }
    if (ret.status === "rejected") {
      throw new BadRequestException("Rejected returns cannot be dispatched");
    }

    // Re-check approval status from source of truth before dispatching
    if (ret.approvalInstanceId) {
      const approval = await this.approvalsService.findOne(context, ret.approvalInstanceId);
      if (approval.status === "rejected") {
        throw new BadRequestException("Rejected returns cannot be dispatched");
      }
      if (approval.status !== "approved") {
        throw new ForbiddenException(
          "Return cannot be dispatched until fully approved (both BM and HQ)",
        );
      }
    } else if (ret.status !== "approved") {
      throw new ForbiddenException(
        "Return cannot be dispatched until fully approved (both BM and HQ)",
      );
    }

    // Validate lots and quantities before mutating anything
    const lines = ret.lines ?? [];
    if (lines.length === 0) {
      throw new BadRequestException("Return must have at least one line to dispatch");
    }

    const lotSnapshots: Array<{ lot: InventoryLot; newQty: number; line: SupplierReturnLine }> = [];
    for (const line of lines) {
      const lot = await this.lotRepo.findOne({
        where: { id: line.lotId, tenantId: scope.tenantId, branchId: scope.branchId },
      });
      if (!lot) throw new NotFoundException(`Lot ${line.lotId} not found`);
      const newQty = lot.quantityOnHand - line.quantity;
      if (newQty < 0) {
        throw new BadRequestException(
          `Cannot return more than available: lot ${lot.lotCode} has ${lot.quantityOnHand}, returning ${line.quantity}`,
        );
      }
      lotSnapshots.push({ lot, newQty, line });
    }

    // Apply decrements and record movements
    for (const { lot, newQty, line } of lotSnapshots) {
      lot.quantityOnHand = newQty;
      await this.lotRepo.save(lot);

      await this.movementRepo.save(
        this.movementRepo.create({
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId: line.medicineId,
          lotId: line.lotId,
          type: InventoryMovementType.SUPPLIER_RETURN,
          referenceType: InventoryMovementReferenceType.SUPPLIER_RETURN,
          referenceId: ret.id,
          quantity: -line.quantity,
          unitCost: lot.unitCost,
        }),
      );
    }

    const now = new Date();
    ret.status = "dispatched";
    ret.dispatchedAt = now;
    ret.dispatchedByUserId = scope.userId;
    const saved = await this.returnRepo.save(ret);

    await this.auditEventsService.recordEvent({
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      action: "supplier_return.dispatched",
      entityType: "supplier_return",
      entityId: saved.id,
      metadata: {
        supplierId: ret.supplierId,
        lineCount: lines.length,
      },
    });

    return saved;
  }
}
