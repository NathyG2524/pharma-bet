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
import { Branch } from "../../entities/branch.entity";
import { Medicine } from "../../entities/medicine.entity";
import { PurchaseOrderEvent } from "../../entities/purchase-order-event.entity";
import { PurchaseOrderLine } from "../../entities/purchase-order-line.entity";
import { PurchaseOrder, PurchaseOrderStatus } from "../../entities/purchase-order.entity";
import { Supplier } from "../../entities/supplier.entity";
import { UserRole } from "../../entities/user-membership.entity";
import { MedicinesService } from "../medicines/services/medicines.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { AuthContext } from "../tenancy/auth-context";
import type {
  CreatePurchaseOrderDto,
  PurchaseOrderDecisionDto,
  PurchaseOrderLineInputDto,
  UpdatePurchaseOrderDto,
} from "./dto/purchase-order.dto";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BRANCH_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(PurchaseOrderEvent)
    private readonly eventRepo: Repository<PurchaseOrderEvent>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @Inject(MedicinesService)
    private readonly medicinesService: MedicinesService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  private requireTenant(context: AuthContext) {
    if (!context.tenantId || !context.userId) {
      throw new UnauthorizedException("Tenant and user context required");
    }
    return { tenantId: context.tenantId, userId: context.userId };
  }

  private isHq(context: AuthContext) {
    return context.roles.some((role) => HQ_ROLES.includes(role));
  }

  private isBranchUser(context: AuthContext) {
    return context.roles.some((role) => BRANCH_ROLES.includes(role));
  }

  private assertBranchAccess(context: AuthContext, po: PurchaseOrder) {
    if (!context.activeBranchId) {
      throw new ForbiddenException("Active branch is required");
    }
    if (!context.branchIds.includes(context.activeBranchId)) {
      throw new ForbiddenException("User does not have access to this branch");
    }
    if (context.activeBranchId !== po.branchId) {
      throw new ForbiddenException("Purchase order not assigned to this branch");
    }
  }

  private async ensureSupplier(context: AuthContext, supplierId: string): Promise<Supplier> {
    const scope = this.requireTenant(context);
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId, tenantId: scope.tenantId },
    });
    if (!supplier) {
      throw new NotFoundException("Supplier not found for tenant");
    }
    return supplier;
  }

  private async ensureBranch(context: AuthContext, branchId: string): Promise<Branch> {
    const scope = this.requireTenant(context);
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, tenantId: scope.tenantId },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found for tenant");
    }
    return branch;
  }

  private async validateLines(
    context: AuthContext,
    lines: PurchaseOrderLineInputDto[],
  ): Promise<{
    linePayloads: Array<Pick<PurchaseOrderLine, "medicineId" | "quantity" | "unitCost">>;
  }> {
    if (!lines.length) {
      throw new BadRequestException("Purchase order requires at least one line");
    }
    const scope = this.requireTenant(context);
    const uniqueIds = Array.from(new Set(lines.map((line) => line.medicineId)));
    const medicines = await this.medicineRepo.find({
      where: { tenantId: scope.tenantId, id: In(uniqueIds) },
    });
    if (medicines.length !== uniqueIds.length) {
      throw new NotFoundException("One or more medicines not found for tenant");
    }
    const medicineMap = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    for (const line of lines) {
      const medicine = medicineMap.get(line.medicineId);
      if (!medicine) {
        throw new NotFoundException("Medicine not found for tenant");
      }
      this.medicinesService.assertNotDraft(medicine);
    }
    return {
      linePayloads: lines.map((line) => ({
        medicineId: line.medicineId,
        quantity: line.quantity,
        unitCost: line.unitCost?.trim() || null,
      })),
    };
  }

  private async recordEvent(params: {
    po: PurchaseOrder;
    context: AuthContext;
    action: string;
    reason?: string | null;
    manager?: Repository<PurchaseOrderEvent>;
  }): Promise<PurchaseOrderEvent> {
    const { po, context, action, reason } = params;
    const scope = this.requireTenant(context);
    const repo = params.manager ?? this.eventRepo;
    const event = repo.create({
      purchaseOrderId: po.id,
      tenantId: scope.tenantId,
      branchId: po.branchId,
      userId: scope.userId,
      action,
      reason: reason?.trim() || null,
    });
    return repo.save(event);
  }

  private async loadDetail(id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: { lines: { medicine: true }, supplier: true, branch: true },
    });
    if (!po) {
      throw new NotFoundException("Purchase order not found");
    }
    return po;
  }

  async list(context: AuthContext, status?: PurchaseOrderStatus) {
    const scope = this.requireTenant(context);
    const where = {
      tenantId: scope.tenantId,
      ...(status ? { status } : {}),
    };
    const [items, total] = await this.poRepo.findAndCount({
      where,
      relations: { supplier: true, branch: true },
      order: { createdAt: "DESC" },
    });
    return { items, total };
  }

  async listInbox(context: AuthContext, status?: PurchaseOrderStatus) {
    if (!this.isBranchUser(context)) {
      throw new ForbiddenException("Branch role required");
    }
    const scope = this.requireTenant(context);
    if (!context.activeBranchId) {
      throw new BadRequestException("Active branch required");
    }
    const where = {
      tenantId: scope.tenantId,
      branchId: context.activeBranchId,
      ...(status ? { status } : { status: PurchaseOrderStatus.PENDING_APPROVAL }),
    };
    const [items, total] = await this.poRepo.findAndCount({
      where,
      relations: { supplier: true, branch: true },
      order: { createdAt: "DESC" },
    });
    return { items, total };
  }

  async findOne(context: AuthContext, id: string): Promise<PurchaseOrder> {
    const po = await this.loadDetail(id);
    if (this.isHq(context)) {
      return po;
    }
    if (!this.isBranchUser(context)) {
      throw new ForbiddenException("Insufficient role for purchase orders");
    }
    this.assertBranchAccess(context, po);
    return po;
  }

  async listEvents(context: AuthContext, id: string) {
    const po = await this.loadDetail(id);
    if (this.isHq(context)) {
      return this.eventRepo.find({
        where: { purchaseOrderId: po.id },
        order: { createdAt: "ASC" },
      });
    }
    if (!this.isBranchUser(context)) {
      throw new ForbiddenException("Insufficient role for purchase orders");
    }
    this.assertBranchAccess(context, po);
    return this.eventRepo.find({
      where: { purchaseOrderId: po.id },
      order: { createdAt: "ASC" },
    });
  }

  async create(context: AuthContext, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    if (!this.isHq(context)) {
      throw new ForbiddenException("HQ role required");
    }
    const scope = this.requireTenant(context);
    await this.ensureSupplier(context, dto.supplierId);
    await this.ensureBranch(context, dto.branchId);
    const { linePayloads } = await this.validateLines(context, dto.lines);

    return this.poRepo.manager.transaction(async (manager) => {
      const po = manager.create(PurchaseOrder, {
        tenantId: scope.tenantId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        status: PurchaseOrderStatus.DRAFT,
        notes: dto.notes?.trim() || null,
        createdBy: scope.userId,
        updatedBy: scope.userId,
      });
      const saved = await manager.save(po);
      const lines = linePayloads.map((line) =>
        manager.create(PurchaseOrderLine, { ...line, purchaseOrderId: saved.id }),
      );
      await manager.save(lines);
      await this.recordEvent({
        po: saved,
        context,
        action: "created",
        manager: manager.getRepository(PurchaseOrderEvent),
      });
      return manager.findOneOrFail(PurchaseOrder, {
        where: { id: saved.id },
        relations: { lines: { medicine: true }, supplier: true, branch: true },
      });
    });
  }

  async update(
    context: AuthContext,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    if (!this.isHq(context)) {
      throw new ForbiddenException("HQ role required");
    }
    const scope = this.requireTenant(context);
    const po = await this.loadDetail(id);
    if (![PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CHANGES_REQUESTED].includes(po.status)) {
      throw new BadRequestException("Only draft or changes-requested orders can be edited");
    }
    const nextSupplierId = dto.supplierId ?? po.supplierId;
    const nextBranchId = dto.branchId ?? po.branchId;
    if (!nextSupplierId) {
      throw new BadRequestException("Supplier is required");
    }
    await this.ensureSupplier(context, nextSupplierId);
    await this.ensureBranch(context, nextBranchId);
    const linePayloads = dto.lines
      ? (await this.validateLines(context, dto.lines)).linePayloads
      : null;

    return this.poRepo.manager.transaction(async (manager) => {
      po.supplierId = nextSupplierId;
      po.branchId = nextBranchId;
      if (dto.notes !== undefined) {
        po.notes = dto.notes?.trim() || null;
      }
      po.updatedBy = scope.userId;
      await manager.save(po);
      if (linePayloads) {
        await manager.delete(PurchaseOrderLine, { purchaseOrderId: po.id });
        const newLines = linePayloads.map((line) =>
          manager.create(PurchaseOrderLine, { ...line, purchaseOrderId: po.id }),
        );
        await manager.save(newLines);
      }
      await this.recordEvent({
        po,
        context,
        action: "updated",
        manager: manager.getRepository(PurchaseOrderEvent),
      });
      return manager.findOneOrFail(PurchaseOrder, {
        where: { id: po.id },
        relations: { lines: { medicine: true }, supplier: true, branch: true },
      });
    });
  }

  async submit(context: AuthContext, id: string): Promise<PurchaseOrder> {
    if (!this.isHq(context)) {
      throw new ForbiddenException("HQ role required");
    }
    const scope = this.requireTenant(context);
    const po = await this.loadDetail(id);
    if (![PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CHANGES_REQUESTED].includes(po.status)) {
      throw new BadRequestException("Purchase order cannot be submitted in its current state");
    }
    const lineCount = await this.lineRepo.count({ where: { purchaseOrderId: po.id } });
    if (!lineCount) {
      throw new BadRequestException("Purchase order must have at least one line before submit");
    }
    const action = po.status === PurchaseOrderStatus.DRAFT ? "submitted" : "resubmitted";

    const updated = await this.poRepo.manager.transaction(async (manager) => {
      po.status = PurchaseOrderStatus.PENDING_APPROVAL;
      po.updatedBy = scope.userId;
      await manager.save(po);
      await this.recordEvent({
        po,
        context,
        action,
        manager: manager.getRepository(PurchaseOrderEvent),
      });
      return manager.findOneOrFail(PurchaseOrder, {
        where: { id: po.id },
        relations: { lines: { medicine: true }, supplier: true, branch: true },
      });
    });

    await this.notificationsService.notifyPoPendingBranchApproval(context, {
      poId: updated.id,
      branchId: updated.branchId,
      poNumber: updated.id,
    });

    return updated;
  }

  async approve(context: AuthContext, id: string): Promise<PurchaseOrder> {
    const po = await this.loadDetail(id);
    if (!this.isBranchUser(context)) {
      throw new ForbiddenException("Branch role required");
    }
    this.assertBranchAccess(context, po);
    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Purchase order is not awaiting approval");
    }
    return this.poRepo.manager.transaction(async (manager) => {
      po.status = PurchaseOrderStatus.APPROVED;
      po.updatedBy = context.userId ?? po.updatedBy;
      await manager.save(po);
      await this.recordEvent({
        po,
        context,
        action: "approved",
        manager: manager.getRepository(PurchaseOrderEvent),
      });
      return manager.findOneOrFail(PurchaseOrder, {
        where: { id: po.id },
        relations: { lines: { medicine: true }, supplier: true, branch: true },
      });
    });
  }

  async reject(
    context: AuthContext,
    id: string,
    dto: PurchaseOrderDecisionDto,
  ): Promise<PurchaseOrder> {
    const po = await this.loadDetail(id);
    if (!this.isBranchUser(context)) {
      throw new ForbiddenException("Branch role required");
    }
    this.assertBranchAccess(context, po);
    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Purchase order is not awaiting approval");
    }
    return this.poRepo.manager.transaction(async (manager) => {
      po.status = PurchaseOrderStatus.REJECTED;
      po.updatedBy = context.userId ?? po.updatedBy;
      await manager.save(po);
      await this.recordEvent({
        po,
        context,
        action: "rejected",
        reason: dto.reason,
        manager: manager.getRepository(PurchaseOrderEvent),
      });
      return manager.findOneOrFail(PurchaseOrder, {
        where: { id: po.id },
        relations: { lines: { medicine: true }, supplier: true, branch: true },
      });
    });
  }

  async requestChanges(
    context: AuthContext,
    id: string,
    dto: PurchaseOrderDecisionDto,
  ): Promise<PurchaseOrder> {
    const po = await this.loadDetail(id);
    if (!this.isBranchUser(context)) {
      throw new ForbiddenException("Branch role required");
    }
    this.assertBranchAccess(context, po);
    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Purchase order is not awaiting approval");
    }
    return this.poRepo.manager.transaction(async (manager) => {
      po.status = PurchaseOrderStatus.CHANGES_REQUESTED;
      po.updatedBy = context.userId ?? po.updatedBy;
      await manager.save(po);
      await this.recordEvent({
        po,
        context,
        action: "changes_requested",
        reason: dto.reason,
        manager: manager.getRepository(PurchaseOrderEvent),
      });
      return manager.findOneOrFail(PurchaseOrder, {
        where: { id: po.id },
        relations: { lines: { medicine: true }, supplier: true, branch: true },
      });
    });
  }
}
