import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, QueryFailedError, type Repository } from "typeorm";
import { Branch } from "../../entities/branch.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import {
  InventoryMovement,
  InventoryMovementReferenceType,
  InventoryMovementType,
} from "../../entities/inventory-movement.entity";
import { MedicineOverlay } from "../../entities/medicine-overlay.entity";
import { Medicine } from "../../entities/medicine.entity";
import { PurchaseOrderLine } from "../../entities/purchase-order-line.entity";
import { PurchaseOrderReceiptLine } from "../../entities/purchase-order-receipt-line.entity";
import { PurchaseOrderReceipt } from "../../entities/purchase-order-receipt.entity";
import { PurchaseOrder, PurchaseOrderStatus } from "../../entities/purchase-order.entity";
import { isLotExpired } from "../inventory/lot-expiry";
import { MedicinesService } from "../medicines/services/medicines.service";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import type { ReceivePurchaseOrderDto } from "./dto/receive-purchase-order.dto";

type PurchaseOrderLineView = {
  id: string;
  medicineId: string;
  medicineName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: string | null;
};

type PurchaseOrderReceiptLineView = {
  id: string;
  purchaseOrderLineId: string;
  medicineId: string;
  lotCode: string;
  expiryDate: string;
  quantity: number;
  unitCost: string;
  expiryOverrideReason: string | null;
};

type PurchaseOrderReceiptView = {
  id: string;
  receiptKey: string;
  receivedAt: Date;
  lines: PurchaseOrderReceiptLineView[];
};

type PurchaseOrderDetailView = {
  id: string;
  branchId: string;
  branchName: string;
  orderNumber: string | null;
  status: PurchaseOrderStatus;
  createdAt: Date;
  updatedAt: Date;
  lines: PurchaseOrderLineView[];
  receipts: PurchaseOrderReceiptView[];
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(PurchaseOrderReceipt)
    private readonly receiptRepo: Repository<PurchaseOrderReceipt>,
    @InjectRepository(PurchaseOrderReceiptLine)
    private readonly receiptLineRepo: Repository<PurchaseOrderReceiptLine>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(MedicineOverlay)
    private readonly overlayRepo: Repository<MedicineOverlay>,
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @Inject(MedicinesService)
    private readonly medicinesService: MedicinesService,
  ) {}

  private getTenantScope(context: AuthContext) {
    if (!context.tenantId) {
      throw new NotFoundException("Tenant context required");
    }
    return { tenantId: context.tenantId };
  }

  private getBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { tenantId: context.tenantId, branchId: context.activeBranchId };
  }

  async listPurchaseOrders(
    context: AuthContext,
  ): Promise<{ items: Array<PurchaseOrderDetailView & { lineCount: number }>; total: number }> {
    const scope = this.getTenantScope(context);
    const qb = this.poRepo
      .createQueryBuilder("po")
      .leftJoinAndSelect("po.branch", "branch")
      .loadRelationCountAndMap("po.lineCount", "po.lines")
      .where("po.tenantId = :tenantId", { tenantId: scope.tenantId })
      .orderBy("po.createdAt", "DESC");
    if (!isHqRole(context)) {
      const branchScope = this.getBranchScope(context);
      qb.andWhere("po.branchId = :branchId", { branchId: branchScope.branchId });
    }
    const [items, total] = await qb.getManyAndCount();
    const mapped = items.map((po) => ({
      id: po.id,
      branchId: po.branchId,
      branchName: po.branch?.name ?? "Unknown",
      orderNumber: po.orderNumber,
      status: po.status,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      lines: [],
      receipts: [],
      lineCount: (po as PurchaseOrder & { lineCount?: number }).lineCount ?? 0,
    }));
    return { items: mapped, total };
  }

  async getPurchaseOrder(context: AuthContext, id: string): Promise<PurchaseOrderDetailView> {
    const scope = this.getTenantScope(context);
    const po = await this.poRepo.findOne({
      where: { id, tenantId: scope.tenantId },
      relations: {
        branch: true,
        lines: { medicine: true },
        receipts: { lines: true },
      },
      order: { receipts: { receivedAt: "DESC" } },
    });
    if (!po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }
    if (!isHqRole(context)) {
      const branchScope = this.getBranchScope(context);
      if (po.branchId !== branchScope.branchId) {
        throw new ForbiddenException("Purchase order not for this branch");
      }
    }
    return this.buildPurchaseOrderDetail(po);
  }

  async createPurchaseOrder(context: AuthContext, dto: CreatePurchaseOrderDto) {
    const scope = this.getTenantScope(context);
    const branch = await this.branchRepo.findOne({
      where: { id: dto.branchId, tenantId: scope.tenantId },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found for tenant");
    }
    const medicineIds = Array.from(new Set(dto.lines.map((line) => line.medicineId)));
    const medicines = await this.medicineRepo.find({
      where: { id: In(medicineIds), tenantId: scope.tenantId },
    });
    if (medicines.length !== medicineIds.length) {
      throw new NotFoundException("One or more medicines not found");
    }
    for (const medicine of medicines) {
      this.medicinesService.assertNotDraft(medicine);
    }
    const po = this.poRepo.create({
      tenantId: scope.tenantId,
      branchId: branch.id,
      orderNumber: dto.orderNumber?.trim() || null,
      status: PurchaseOrderStatus.DRAFT,
    });
    await this.poRepo.save(po);
    const lines = dto.lines.map((line) =>
      this.lineRepo.create({
        purchaseOrderId: po.id,
        medicineId: line.medicineId,
        orderedQuantity: line.quantity,
        unitCost: line.unitCost?.trim() || null,
      }),
    );
    await this.lineRepo.save(lines);
    return this.getPurchaseOrder(context, po.id);
  }

  async approvePurchaseOrder(context: AuthContext, id: string) {
    const scope = this.getBranchScope(context);
    const po = await this.poRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }
    if (po.status === PurchaseOrderStatus.RECEIVED) {
      return this.getPurchaseOrder(context, po.id);
    }
    po.status = PurchaseOrderStatus.APPROVED;
    await this.poRepo.save(po);
    return this.getPurchaseOrder(context, po.id);
  }

  async receivePurchaseOrder(context: AuthContext, id: string, dto: ReceivePurchaseOrderDto) {
    const scope = this.getBranchScope(context);
    return this.poRepo.manager.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);
      const lineRepo = manager.getRepository(PurchaseOrderLine);
      const receiptRepo = manager.getRepository(PurchaseOrderReceipt);
      const receiptLineRepo = manager.getRepository(PurchaseOrderReceiptLine);
      const overlayRepo = manager.getRepository(MedicineOverlay);
      const lotRepo = manager.getRepository(InventoryLot);
      const movementRepo = manager.getRepository(InventoryMovement);

      const po = await poRepo.findOne({
        where: { id, tenantId: scope.tenantId },
        lock: { mode: "pessimistic_write" },
      });
      if (!po) {
        throw new NotFoundException(`Purchase order ${id} not found`);
      }
      if (po.branchId !== scope.branchId) {
        throw new ForbiddenException("Purchase order not for this branch");
      }
      if (po.status !== PurchaseOrderStatus.APPROVED) {
        throw new BadRequestException("Purchase order is not approved");
      }

      const receiptKey = dto.receiptKey.trim();
      if (!receiptKey) {
        throw new BadRequestException("Receipt key is required");
      }
      const existingReceipt = await receiptRepo.findOne({
        where: { tenantId: scope.tenantId, purchaseOrderId: po.id, receiptKey },
        relations: { lines: true },
      });
      if (existingReceipt) {
        return this.buildReceiptView(existingReceipt);
      }

      const poLines = await lineRepo.find({
        where: { purchaseOrderId: po.id },
        lock: { mode: "pessimistic_write" },
      });
      if (!poLines.length) {
        throw new BadRequestException("Purchase order has no lines");
      }
      const poLineMap = new Map(poLines.map((line) => [line.id, line]));

      const receivedRows = await receiptLineRepo
        .createQueryBuilder("line")
        .select("line.purchaseOrderLineId", "lineId")
        .addSelect("SUM(line.quantity)", "receivedQuantity")
        .where("line.purchaseOrderLineId IN (:...ids)", {
          ids: poLines.map((line) => line.id),
        })
        .groupBy("line.purchaseOrderLineId")
        .getRawMany();
      const receivedMap = new Map<string, number>(
        receivedRows.map((row) => [row.lineId as string, Number(row.receivedQuantity || 0)]),
      );
      const incomingTotals = new Map<string, number>();
      for (const line of dto.lines) {
        const current = incomingTotals.get(line.purchaseOrderLineId) ?? 0;
        incomingTotals.set(line.purchaseOrderLineId, current + line.quantity);
      }

      for (const [lineId, incoming] of incomingTotals.entries()) {
        const poLine = poLineMap.get(lineId);
        if (!poLine) {
          throw new BadRequestException(`Line ${lineId} does not belong to this PO`);
        }
        const receivedQuantity = receivedMap.get(lineId) ?? 0;
        const remaining = poLine.orderedQuantity - receivedQuantity;
        if (incoming > remaining) {
          throw new ConflictException(`Line ${lineId} exceeds remaining quantity`);
        }
      }

      const receipt = receiptRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        purchaseOrderId: po.id,
        receiptKey,
        receivedAt: new Date(dto.receivedAt),
      });
      await receiptRepo.save(receipt);

      const receiptLines: PurchaseOrderReceiptLine[] = [];
      for (const line of dto.lines) {
        const poLine = poLineMap.get(line.purchaseOrderLineId);
        if (!poLine) {
          throw new BadRequestException(
            `Line ${line.purchaseOrderLineId} does not belong to this PO`,
          );
        }
        const lotCode = line.lotCode.trim();
        const expiryDate = line.expiryDate;
        const unitCost = line.unitCost.trim();
        if (!lotCode) {
          throw new BadRequestException("Lot code is required");
        }
        if (!unitCost) {
          throw new BadRequestException("Unit cost is required");
        }
        const overrideReason = line.expiryOverrideReason?.trim() || null;
        if (isLotExpired(expiryDate) && !overrideReason) {
          throw new BadRequestException(
            `Lot ${lotCode} is expired. Provide an override reason to receive it.`,
          );
        }
        let lot = await lotRepo.findOne({
          where: {
            tenantId: scope.tenantId,
            branchId: scope.branchId,
            medicineId: poLine.medicineId,
            lotCode,
            expiryDate,
            unitCost,
          },
          lock: { mode: "pessimistic_write" },
        });
        if (!lot) {
          lot = lotRepo.create({
            tenantId: scope.tenantId,
            branchId: scope.branchId,
            medicineId: poLine.medicineId,
            lotCode,
            expiryDate,
            unitCost,
            quantityOnHand: 0,
          });
        }
        lot.quantityOnHand += line.quantity;
        lot = await saveLotWithRetry(lotRepo, lot, line.quantity, {
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId: poLine.medicineId,
          lotCode,
          expiryDate,
          unitCost,
        });

        let overlay = await overlayRepo.findOne({
          where: {
            tenantId: scope.tenantId,
            branchId: scope.branchId,
            medicineId: poLine.medicineId,
          },
          lock: { mode: "pessimistic_write" },
        });
        if (!overlay) {
          overlay = overlayRepo.create({
            tenantId: scope.tenantId,
            branchId: scope.branchId,
            medicineId: poLine.medicineId,
            stockQuantity: 0,
            reorderMin: null,
            reorderMax: null,
            binLocation: null,
            localPrice: null,
            localCost: null,
          });
        }
        overlay.stockQuantity += line.quantity;
        overlay = await saveOverlayWithRetry(overlayRepo, overlay, line.quantity, {
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId: poLine.medicineId,
        });

        const receiptLine = receiptLineRepo.create({
          receiptId: receipt.id,
          purchaseOrderLineId: poLine.id,
          medicineId: poLine.medicineId,
          lotCode,
          expiryDate,
          quantity: line.quantity,
          unitCost,
          expiryOverrideReason: overrideReason,
        });
        const savedLine = await receiptLineRepo.save(receiptLine);
        receiptLines.push(savedLine);

        const movement = movementRepo.create({
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId: poLine.medicineId,
          lotId: lot.id,
          type: InventoryMovementType.RECEIPT,
          referenceType: InventoryMovementReferenceType.PURCHASE_ORDER_RECEIPT,
          referenceId: savedLine.id,
          quantity: line.quantity,
          unitCost,
        });
        await movementRepo.save(movement);
      }

      const updatedReceived = await receiptLineRepo
        .createQueryBuilder("line")
        .select("line.purchaseOrderLineId", "lineId")
        .addSelect("SUM(line.quantity)", "receivedQuantity")
        .where("line.purchaseOrderLineId IN (:...ids)", {
          ids: poLines.map((line) => line.id),
        })
        .groupBy("line.purchaseOrderLineId")
        .getRawMany();
      const updatedMap = new Map<string, number>(
        updatedReceived.map((row) => [row.lineId as string, Number(row.receivedQuantity || 0)]),
      );
      const fullyReceived = poLines.every(
        (line) => (updatedMap.get(line.id) ?? 0) >= line.orderedQuantity,
      );
      if (fullyReceived) {
        po.status = PurchaseOrderStatus.RECEIVED;
        await poRepo.save(po);
      }

      return this.buildReceiptView({ ...receipt, lines: receiptLines });
    });
  }

  private buildPurchaseOrderDetail(po: PurchaseOrder): PurchaseOrderDetailView {
    const receivedMap = new Map<string, number>();
    for (const receipt of po.receipts ?? []) {
      for (const line of receipt.lines ?? []) {
        receivedMap.set(
          line.purchaseOrderLineId,
          (receivedMap.get(line.purchaseOrderLineId) ?? 0) + line.quantity,
        );
      }
    }
    const lines = (po.lines ?? []).map((line) => ({
      id: line.id,
      medicineId: line.medicineId,
      medicineName: line.medicine?.name ?? "Unknown",
      orderedQuantity: line.orderedQuantity,
      receivedQuantity: receivedMap.get(line.id) ?? 0,
      unitCost: line.unitCost ?? null,
    }));
    const receipts = (po.receipts ?? [])
      .map((receipt) => this.buildReceiptView(receipt))
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    return {
      id: po.id,
      branchId: po.branchId,
      branchName: po.branch?.name ?? "Unknown",
      orderNumber: po.orderNumber,
      status: po.status,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      lines,
      receipts,
    };
  }

  private buildReceiptView(receipt: PurchaseOrderReceipt): PurchaseOrderReceiptView {
    return {
      id: receipt.id,
      receiptKey: receipt.receiptKey,
      receivedAt: receipt.receivedAt,
      lines: (receipt.lines ?? []).map((line) => ({
        id: line.id,
        purchaseOrderLineId: line.purchaseOrderLineId,
        medicineId: line.medicineId,
        lotCode: line.lotCode,
        expiryDate: line.expiryDate,
        quantity: line.quantity,
        unitCost: line.unitCost,
        expiryOverrideReason: line.expiryOverrideReason,
      })),
    };
  }
}

const saveOverlayWithRetry = async (
  repo: Repository<MedicineOverlay>,
  entity: MedicineOverlay,
  delta: number,
  lookup: { tenantId: string; branchId: string; medicineId: string },
): Promise<MedicineOverlay> => {
  try {
    return await repo.save(entity);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await repo.findOne({
        where: lookup,
        lock: { mode: "pessimistic_write" },
      });
      if (!existing) throw error;
      existing.stockQuantity += delta;
      return repo.save(existing);
    }
    throw error;
  }
};

const saveLotWithRetry = async (
  repo: Repository<InventoryLot>,
  entity: InventoryLot,
  delta: number,
  lookup: {
    tenantId: string;
    branchId: string;
    medicineId: string;
    lotCode: string;
    expiryDate: string;
    unitCost: string;
  },
): Promise<InventoryLot> => {
  try {
    return await repo.save(entity);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await repo.findOne({
        where: lookup,
        lock: { mode: "pessimistic_write" },
      });
      if (!existing) throw error;
      existing.quantityOnHand += delta;
      return repo.save(existing);
    }
    throw error;
  }
};

const isUniqueViolation = (error: unknown) =>
  error instanceof QueryFailedError && (error as { code?: string }).code === "23505";

const isHqRole = (context: AuthContext) =>
  context.roles?.some((role) => ["hq_admin", "hq_user", "platform_admin"].includes(role));
