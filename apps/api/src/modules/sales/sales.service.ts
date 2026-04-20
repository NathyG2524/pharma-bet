import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In } from "typeorm";
import type { EntityManager, Repository } from "typeorm";
import { BranchTaxSetting } from "../../entities/branch-tax-setting.entity";
import { InventoryLot, InventoryLotStatus } from "../../entities/inventory-lot.entity";
import { MedicineOverlay } from "../../entities/medicine-overlay.entity";
import { Medicine, MedicineStatus } from "../../entities/medicine.entity";
import { Patient } from "../../entities/patient.entity";
import { SaleLineAllocation } from "../../entities/sale-line-allocation.entity";
import { SaleLine } from "../../entities/sale-line.entity";
import { Sale } from "../../entities/sale.entity";
import { TaxCategory } from "../../entities/tax-category.entity";
import { UserRole } from "../../entities/user-membership.entity";
import { type AuditEventInput, AuditEventsService } from "../audit-events/audit-events.service";
import { BLOCKED_LOT_STATUSES } from "../inventory/lot-status";
import type { AuthContext } from "../tenancy/auth-context";
import type {
  CreateSaleDto,
  CreateSaleLineAllocationDto,
  CreateSaleLineDto,
} from "./dto/create-sale.dto";
import { allocateFefoLots } from "./sales-allocation";
import {
  ZERO_DECIMAL,
  addDecimalStrings,
  computeCogs,
  computeLineTotals,
  sumDecimalStrings,
} from "./sales-calculation";

const OVERRIDE_ROLES = new Set<UserRole>([
  UserRole.BRANCH_MANAGER,
  UserRole.HQ_ADMIN,
  UserRole.HQ_USER,
  UserRole.PLATFORM_ADMIN,
]);

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine)
    private readonly lineRepo: Repository<SaleLine>,
    @InjectRepository(SaleLineAllocation)
    private readonly allocationRepo: Repository<SaleLineAllocation>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(MedicineOverlay)
    private readonly overlayRepo: Repository<MedicineOverlay>,
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
  ) {}

  private getBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { tenantId: context.tenantId, branchId: context.activeBranchId };
  }

  private ensureOverrideAuthorized(context: AuthContext) {
    if (!context.roles.some((role) => OVERRIDE_ROLES.has(role))) {
      throw new ForbiddenException("Lot override requires manager authorization");
    }
  }

  private async resolveTaxRate(
    manager: EntityManager,
    scope: { tenantId: string; branchId: string },
    medicine: Medicine,
  ): Promise<string | null> {
    const settingsRepo = manager.getRepository(BranchTaxSetting);
    const categoryRepo = manager.getRepository(TaxCategory);
    const settings = await settingsRepo.findOne({
      where: { tenantId: scope.tenantId, branchId: scope.branchId },
    });
    const defaultCategoryId = settings?.defaultTaxCategoryId ?? null;
    const categoryId = medicine.taxCategoryId ?? defaultCategoryId;
    let rate = settings?.taxRateOverride ?? null;
    if (rate == null && categoryId) {
      const category = await categoryRepo.findOne({
        where: { id: categoryId, tenantId: scope.tenantId },
      });
      rate = category?.rate ?? null;
    }
    return rate;
  }

  private async buildLineTotals(
    manager: EntityManager,
    scope: { tenantId: string; branchId: string },
    medicine: Medicine,
    quantity: number,
    unitPrice: string,
  ) {
    const rate = await this.resolveTaxRate(manager, scope, medicine);
    return computeLineTotals({ quantity, unitPrice, taxRate: rate });
  }

  private async loadLotsForOverride(
    manager: EntityManager,
    scope: { tenantId: string; branchId: string },
    line: CreateSaleLineDto,
    allocations: CreateSaleLineAllocationDto[],
  ) {
    const lotIds = Array.from(new Set(allocations.map((allocation) => allocation.lotId)));
    const lots = await manager.getRepository(InventoryLot).find({
      where: {
        id: In(lotIds),
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId: line.medicineId,
      },
      lock: { mode: "pessimistic_write" },
    });
    if (lots.length !== lotIds.length) {
      throw new NotFoundException("One or more override lots not found");
    }
    return lots;
  }

  private applyOverrideAllocations(
    line: CreateSaleLineDto,
    lots: InventoryLot[],
  ): { allocations: { lotId: string; quantity: number; unitCost: string }[] } {
    const quantitiesByLot = new Map<string, number>();
    for (const allocation of line.allocations ?? []) {
      const next = (quantitiesByLot.get(allocation.lotId) ?? 0) + allocation.quantity;
      quantitiesByLot.set(allocation.lotId, next);
    }
    let total = 0;
    const allocations: { lotId: string; quantity: number; unitCost: string }[] = [];
    for (const lot of lots) {
      const requested = quantitiesByLot.get(lot.id) ?? 0;
      if (!requested) continue;
      if (lot.status !== InventoryLotStatus.ACTIVE) {
        throw new ConflictException("Lot status blocks allocation");
      }
      if (requested > lot.quantityOnHand) {
        throw new ConflictException("Not enough stock in selected lot");
      }
      lot.quantityOnHand -= requested;
      total += requested;
      allocations.push({ lotId: lot.id, quantity: requested, unitCost: lot.unitCost });
    }
    if (total !== line.quantity) {
      throw new BadRequestException("Override allocations must match line quantity");
    }
    return { allocations };
  }

  private async allocateLine(
    manager: EntityManager,
    scope: { tenantId: string; branchId: string },
    line: CreateSaleLineDto,
    context: AuthContext,
  ): Promise<{
    allocations: { lotId: string; quantity: number; unitCost: string }[];
    overrideReason: string | null;
    overrideUsed: boolean;
  }> {
    if (line.allocations?.length) {
      const overrideReason = line.overrideReason?.trim() || null;
      if (!overrideReason) {
        throw new BadRequestException("Override reason is required for manual allocations");
      }
      this.ensureOverrideAuthorized(context);
      const lots = await this.loadLotsForOverride(manager, scope, line, line.allocations);
      const { allocations } = this.applyOverrideAllocations(line, lots);
      await manager.getRepository(InventoryLot).save(lots);
      return { allocations, overrideReason, overrideUsed: true };
    }

    const lots = await manager
      .getRepository(InventoryLot)
      .createQueryBuilder("lot")
      .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
      .andWhere("lot.medicineId = :medicineId", { medicineId: line.medicineId })
      .andWhere("lot.quantityOnHand > 0")
      .andWhere("lot.status = :status", { status: InventoryLotStatus.ACTIVE })
      .orderBy("lot.expiryDate", "ASC")
      .addOrderBy("lot.createdAt", "ASC")
      .setLock("pessimistic_write")
      .getMany();
    let allocations: { lotId: string; quantity: number; unitCost: string }[] = [];
    let updatedLots = lots;
    try {
      ({ allocations, updatedLots } = allocateFefoLots(lots, line.quantity));
    } catch {
      throw new ConflictException("Not enough stock");
    }
    await manager.getRepository(InventoryLot).save(updatedLots);
    return { allocations, overrideReason: null, overrideUsed: false };
  }

  private buildSaleResponse(detail: Sale) {
    return {
      id: detail.id,
      tenantId: detail.tenantId,
      branchId: detail.branchId,
      patientId: detail.patientId,
      recordedAt: detail.recordedAt,
      notes: detail.notes,
      subtotal: detail.subtotal,
      taxTotal: detail.taxTotal,
      totalAmount: detail.totalAmount,
      cogsTotal: detail.cogsTotal,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      lines:
        detail.lines?.map((line) => ({
          id: line.id,
          saleId: line.saleId,
          medicineId: line.medicineId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxBase: line.taxBase,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineSubtotal: line.lineSubtotal,
          lineTotal: line.lineTotal,
          cogsAmount: line.cogsAmount,
          overrideReason: line.overrideReason,
          createdAt: line.createdAt,
          medicine: line.medicine
            ? {
                id: line.medicine.id,
                name: line.medicine.name,
                sku: line.medicine.sku,
                unit: line.medicine.unit,
              }
            : undefined,
          allocations:
            line.allocations?.map((allocation) => ({
              id: allocation.id,
              lotId: allocation.lotId,
              lotCode: allocation.lot?.lotCode ?? "",
              expiryDate: allocation.lot?.expiryDate ?? "",
              unitCost: allocation.unitCost,
              quantity: allocation.quantity,
            })) ?? [],
        })) ?? [],
    };
  }

  async createSale(context: AuthContext, dto: CreateSaleDto) {
    const scope = this.getBranchScope(context);
    if (!dto.lines?.length) {
      throw new BadRequestException("Sale must include at least one line");
    }

    if (dto.patientId) {
      const ok = await this.patientRepo.exists({
        where: { id: dto.patientId, tenantId: scope.tenantId },
      });
      if (!ok) {
        throw new NotFoundException(`Patient ${dto.patientId} not found`);
      }
    }

    const medicineIds = Array.from(new Set(dto.lines.map((line) => line.medicineId)));
    const medicines = await this.medicineRepo.find({
      where: { id: In(medicineIds), tenantId: scope.tenantId },
    });
    if (medicines.length !== medicineIds.length) {
      throw new NotFoundException("Medicine not found");
    }
    const medicineMap = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    for (const medicine of medicines) {
      if (medicine.status === MedicineStatus.DRAFT && medicine.draftBranchId !== scope.branchId) {
        throw new ForbiddenException(
          `Medicine "${medicine.name}" is a draft product owned by another branch`,
        );
      }
    }

    const overrideEvents: AuditEventInput[] = [];
    const detail = await this.saleRepo.manager.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const lineRepo = manager.getRepository(SaleLine);
      const allocationRepo = manager.getRepository(SaleLineAllocation);
      const overlayRepo = manager.getRepository(MedicineOverlay);
      const lotRepo = manager.getRepository(InventoryLot);

      const sale = saleRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        patientId: dto.patientId ?? null,
        recordedAt: new Date(dto.recordedAt),
        notes: dto.notes?.trim() || null,
        subtotal: ZERO_DECIMAL,
        taxTotal: ZERO_DECIMAL,
        totalAmount: ZERO_DECIMAL,
        cogsTotal: ZERO_DECIMAL,
      });
      const savedSale = await saleRepo.save(sale);

      let subtotal = ZERO_DECIMAL;
      let taxTotal = ZERO_DECIMAL;
      let cogsTotal = ZERO_DECIMAL;

      for (const line of dto.lines) {
        const medicine = medicineMap.get(line.medicineId);
        if (!medicine) {
          throw new NotFoundException(`Medicine ${line.medicineId} not found`);
        }

        const overlay =
          (await overlayRepo.findOne({
            where: {
              medicineId: line.medicineId,
              tenantId: scope.tenantId,
              branchId: scope.branchId,
            },
            lock: { mode: "pessimistic_write" },
          })) ??
          overlayRepo.create({
            tenantId: scope.tenantId,
            branchId: scope.branchId,
            medicineId: line.medicineId,
            stockQuantity: 0,
            reorderMin: null,
            reorderMax: null,
            binLocation: null,
            localPrice: null,
            localCost: null,
          });

        const activeRow = await lotRepo
          .createQueryBuilder("lot")
          .select("SUM(lot.quantityOnHand)", "total")
          .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
          .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
          .andWhere("lot.medicineId = :medicineId", { medicineId: line.medicineId })
          .andWhere("lot.status = :status", { status: InventoryLotStatus.ACTIVE })
          .getRawOne<{ total: string | null }>();
        const available = Number(activeRow?.total ?? 0);
        const blockedRow = await lotRepo
          .createQueryBuilder("lot")
          .select("SUM(lot.quantityOnHand)", "total")
          .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
          .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
          .andWhere("lot.medicineId = :medicineId", { medicineId: line.medicineId })
          .andWhere("lot.status IN (:...blocked)", {
            blocked: Array.from(BLOCKED_LOT_STATUSES),
          })
          .getRawOne<{ total: string | null }>();
        const blockedQuantity = Number(blockedRow?.total ?? 0);
        if (available < line.quantity) {
          if (available === 0 && blockedQuantity > 0) {
            throw new ConflictException("Lot status blocks allocation");
          }
          throw new ConflictException("Not enough stock");
        }

        const unitPrice = (line.unitPrice?.trim() || overlay.localPrice?.trim() || "").trim();
        if (!unitPrice) {
          throw new BadRequestException("Unit price is required for sale lines");
        }
        if (!Number.isFinite(Number.parseFloat(unitPrice))) {
          throw new BadRequestException("Unit price must be numeric");
        }

        const totals = await this.buildLineTotals(
          manager,
          scope,
          medicine,
          line.quantity,
          unitPrice,
        );
        const { allocations, overrideReason, overrideUsed } = await this.allocateLine(
          manager,
          scope,
          line,
          context,
        );
        const lineCogs = computeCogs(allocations);

        overlay.stockQuantity -= line.quantity;
        if (overlay.stockQuantity < 0) {
          throw new ConflictException("Not enough stock");
        }
        await overlayRepo.save(overlay);

        const savedLine = await lineRepo.save(
          lineRepo.create({
            saleId: savedSale.id,
            medicineId: line.medicineId,
            quantity: line.quantity,
            unitPrice,
            taxBase: totals.taxBase,
            taxRate: totals.taxRate,
            taxAmount: totals.taxAmount,
            lineSubtotal: totals.lineSubtotal,
            lineTotal: totals.lineTotal,
            cogsAmount: lineCogs,
            overrideReason,
          }),
        );

        const allocationEntities = allocations.map((allocation) =>
          allocationRepo.create({
            saleLineId: savedLine.id,
            lotId: allocation.lotId,
            quantity: allocation.quantity,
            unitCost: allocation.unitCost,
          }),
        );
        await allocationRepo.save(allocationEntities);

        if (overrideUsed) {
          if (!context.userId) {
            throw new UnauthorizedException("User context required for overrides");
          }
          overrideEvents.push({
            tenantId: scope.tenantId,
            actorUserId: context.userId,
            action: "sales.lot.override",
            entityType: "sale_line",
            entityId: savedLine.id,
            metadata: {
              saleId: savedSale.id,
              medicineId: line.medicineId,
              reason: overrideReason,
              allocations: allocationEntities.map((allocation) => ({
                lotId: allocation.lotId,
                quantity: allocation.quantity,
                unitCost: allocation.unitCost,
              })),
            },
          });
        }

        subtotal = sumDecimalStrings([subtotal, totals.lineSubtotal]);
        taxTotal = sumDecimalStrings([taxTotal, totals.taxAmount ?? ZERO_DECIMAL]);
        cogsTotal = sumDecimalStrings([cogsTotal, lineCogs]);
      }

      savedSale.subtotal = subtotal;
      savedSale.taxTotal = taxTotal;
      savedSale.totalAmount = addDecimalStrings(subtotal, taxTotal);
      savedSale.cogsTotal = cogsTotal;
      await saleRepo.save(savedSale);

      const detail = await saleRepo.findOne({
        where: { id: savedSale.id },
        relations: {
          lines: {
            medicine: true,
            allocations: { lot: true },
          },
        },
      });
      if (!detail) {
        throw new NotFoundException("Sale not found after create");
      }
      return this.buildSaleResponse(detail);
    });
    for (const event of overrideEvents) {
      await this.auditEventsService.recordEvent(event);
    }
    return detail;
  }
}
