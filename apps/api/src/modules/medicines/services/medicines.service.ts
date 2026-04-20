import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, type EntityManager, In, type Repository } from "typeorm";
import { BranchTaxSetting } from "../../../entities/branch-tax-setting.entity";
import { InventoryLot } from "../../../entities/inventory-lot.entity";
import {
  InventoryMovement,
  InventoryMovementReferenceType,
  InventoryMovementType,
} from "../../../entities/inventory-movement.entity";
import { MedicineOverlay } from "../../../entities/medicine-overlay.entity";
import {
  MedicineTransaction,
  MedicineTransactionType,
} from "../../../entities/medicine-transaction.entity";
import { Medicine, MedicineStatus } from "../../../entities/medicine.entity";
import { Patient } from "../../../entities/patient.entity";
import { TaxCategory } from "../../../entities/tax-category.entity";
import { isLotExpired } from "../../inventory/lot-expiry";
import { saveLotWithRetry, saveOverlayWithRetry } from "../../inventory/lot-update";
import { computeLineTax } from "../../taxes/tax-calculation";
import type { AuthContext } from "../../tenancy/auth-context";
import type { BuyMedicineDto } from "../dto/medicine-transaction.dto";
import type { SellMedicineDto } from "../dto/medicine-transaction.dto";
import type {
  CreateDraftMedicineDto,
  CreateMedicineDto,
  DedupeCheckQueryDto,
  UpdateMedicineDto,
  UpdateMedicineOverlayDto,
} from "../dto/medicine.dto";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type MedicineReadModel = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  barcode: string | null;
  isActive: boolean;
  status: MedicineStatus;
  draftBranchId: string | null;
  taxCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  stockQuantity: number;
  reorderMin: number | null;
  reorderMax: number | null;
  binLocation: string | null;
  localPrice: string | null;
  localCost: string | null;
};

export type DedupeHint = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  status: MedicineStatus;
  draftBranchId: string | null;
  matchedOn: ("name" | "sku" | "barcode")[];
};

@Injectable()
export class MedicinesService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(MedicineOverlay)
    private readonly overlayRepo: Repository<MedicineOverlay>,
    @InjectRepository(MedicineTransaction)
    private readonly txRepo: Repository<MedicineTransaction>,
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(TaxCategory)
    private readonly taxCategoryRepo: Repository<TaxCategory>,
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

  private async resolveTaxCategoryId(
    tenantId: string,
    taxCategoryId?: string | null,
  ): Promise<string | null | undefined> {
    if (taxCategoryId === undefined) {
      return undefined;
    }
    if (taxCategoryId === null) {
      return null;
    }
    const category = await this.taxCategoryRepo.findOne({
      where: { id: taxCategoryId, tenantId },
    });
    if (!category) {
      throw new BadRequestException("Tax category not found for tenant");
    }
    return category.id;
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

  private async buildLineTax(
    manager: EntityManager,
    scope: { tenantId: string; branchId: string },
    medicine: Medicine,
    quantity: number,
    unitPrice: string | null,
  ): Promise<{ taxBase: string | null; taxRate: string | null; taxAmount: string | null }> {
    const rate = await this.resolveTaxRate(manager, scope, medicine);
    return computeLineTax({ quantity, unitPrice, taxRate: rate });
  }
  private buildReadModel(medicine: Medicine, overlay?: MedicineOverlay | null): MedicineReadModel {
    return {
      id: medicine.id,
      name: medicine.name,
      sku: medicine.sku,
      unit: medicine.unit,
      barcode: medicine.barcode,
      isActive: medicine.isActive,
      status: medicine.status,
      draftBranchId: medicine.draftBranchId,
      taxCategoryId: medicine.taxCategoryId,
      createdAt: medicine.createdAt,
      updatedAt: medicine.updatedAt,
      stockQuantity: overlay?.stockQuantity ?? 0,
      reorderMin: overlay?.reorderMin ?? null,
      reorderMax: overlay?.reorderMax ?? null,
      binLocation: overlay?.binLocation ?? null,
      localPrice: overlay?.localPrice ?? null,
      localCost: overlay?.localCost ?? null,
    };
  }

  private async findCanonical(context: AuthContext, id: string): Promise<Medicine> {
    const scope = this.getTenantScope(context);
    const medicine = await this.medicineRepo.findOne({
      where: { id, tenantId: scope.tenantId, status: MedicineStatus.CANONICAL },
    });
    if (!medicine) {
      throw new NotFoundException(`Medicine ${id} not found`);
    }
    return medicine;
  }

  /** Find a medicine by id scoped to tenant; includes drafts owned by this branch. */
  private async findMedicineForBranch(
    context: AuthContext,
    id: string,
    branchId: string,
  ): Promise<Medicine> {
    const scope = this.getTenantScope(context);
    const medicine = await this.medicineRepo.findOne({
      where: { id, tenantId: scope.tenantId },
    });
    if (!medicine) {
      throw new NotFoundException(`Medicine ${id} not found`);
    }
    if (medicine.status === MedicineStatus.DRAFT && medicine.draftBranchId !== branchId) {
      throw new NotFoundException(`Medicine ${id} not found`);
    }
    return medicine;
  }

  async list(
    context: AuthContext,
    options: {
      search?: string;
      limit?: number;
      offset?: number;
      includeInactive?: boolean;
    },
  ): Promise<{ items: MedicineReadModel[]; total: number }> {
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, options.offset ?? 0);
    const scope = this.getBranchScope(context);
    const qb = this.medicineRepo.createQueryBuilder("m");
    qb.andWhere("m.tenantId = :tenantId", { tenantId: scope.tenantId });
    // Branch sees canonical products + its own drafts
    qb.andWhere(
      new Brackets((qb2) => {
        qb2
          .where("m.status = :canonical", { canonical: MedicineStatus.CANONICAL })
          .orWhere("(m.status = :draft AND m.draftBranchId = :branchId)", {
            draft: MedicineStatus.DRAFT,
            branchId: scope.branchId,
          });
      }),
    );
    if (!options.includeInactive) {
      qb.andWhere("m.isActive = :active", { active: true });
    }
    if (options.search?.trim()) {
      qb.andWhere("m.name ILIKE :search", {
        search: `%${options.search.trim()}%`,
      });
    }
    qb.orderBy("m.name", "ASC").skip(offset).take(limit);
    const [medicines, total] = await qb.getManyAndCount();
    if (medicines.length === 0) {
      return { items: [], total };
    }
    const overlayRows = await this.overlayRepo.find({
      where: {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId: In(medicines.map((medicine) => medicine.id)),
      },
    });
    const overlayMap = new Map(overlayRows.map((row) => [row.medicineId, row]));
    const items = medicines.map((medicine) =>
      this.buildReadModel(medicine, overlayMap.get(medicine.id)),
    );
    return { items, total };
  }

  async listCanonical(
    context: AuthContext,
    options: { search?: string; limit?: number; offset?: number; includeInactive?: boolean },
  ): Promise<{ items: Medicine[]; total: number }> {
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, options.offset ?? 0);
    const scope = this.getTenantScope(context);
    const qb = this.medicineRepo.createQueryBuilder("m");
    qb.andWhere("m.tenantId = :tenantId", { tenantId: scope.tenantId });
    qb.andWhere("m.status = :status", { status: MedicineStatus.CANONICAL });
    if (!options.includeInactive) {
      qb.andWhere("m.isActive = :active", { active: true });
    }
    if (options.search?.trim()) {
      qb.andWhere("m.name ILIKE :search", {
        search: `%${options.search.trim()}%`,
      });
    }
    qb.orderBy("m.name", "ASC").skip(offset).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listDrafts(
    context: AuthContext,
    options: { search?: string; limit?: number; offset?: number },
  ): Promise<{ items: Medicine[]; total: number }> {
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, options.offset ?? 0);
    const scope = this.getTenantScope(context);
    const qb = this.medicineRepo.createQueryBuilder("m");
    qb.andWhere("m.tenantId = :tenantId", { tenantId: scope.tenantId });
    qb.andWhere("m.status = :status", { status: MedicineStatus.DRAFT });
    if (options.search?.trim()) {
      qb.andWhere("m.name ILIKE :search", {
        search: `%${options.search.trim()}%`,
      });
    }
    qb.orderBy("m.name", "ASC").skip(offset).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOne(context: AuthContext, id: string): Promise<MedicineReadModel> {
    const scope = this.getBranchScope(context);
    const medicine = await this.findMedicineForBranch(context, id, scope.branchId);
    const overlay = await this.overlayRepo.findOne({
      where: { medicineId: id, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    return this.buildReadModel(medicine, overlay);
  }

  async findCanonicalOne(context: AuthContext, id: string): Promise<Medicine> {
    return this.findCanonical(context, id);
  }

  async create(context: AuthContext, dto: CreateMedicineDto): Promise<Medicine> {
    const name = dto.name.trim();
    const scope = this.getTenantScope(context);
    const exists = await this.medicineRepo.exists({
      where: { name, tenantId: scope.tenantId },
    });
    if (exists) {
      throw new ConflictException("A medicine with this name already exists");
    }
    const taxCategoryId = await this.resolveTaxCategoryId(scope.tenantId, dto.taxCategoryId);
    const medicine = this.medicineRepo.create({
      tenantId: scope.tenantId,
      name,
      sku: dto.sku?.trim() || null,
      unit: dto.unit?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      isActive: true,
      status: MedicineStatus.CANONICAL,
      draftBranchId: null,
      taxCategoryId: taxCategoryId ?? null,
    });
    return this.medicineRepo.save(medicine);
  }

  async createDraft(context: AuthContext, dto: CreateDraftMedicineDto): Promise<Medicine> {
    const name = dto.name.trim();
    const scope = this.getBranchScope(context);
    const exists = await this.medicineRepo.exists({
      where: { name, tenantId: scope.tenantId },
    });
    if (exists) {
      throw new ConflictException(
        "A medicine with this name already exists (canonical or draft). Use a unique name.",
      );
    }
    const taxCategoryId = await this.resolveTaxCategoryId(scope.tenantId, dto.taxCategoryId);
    const medicine = this.medicineRepo.create({
      tenantId: scope.tenantId,
      name,
      sku: dto.sku?.trim() || null,
      unit: dto.unit?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      isActive: true,
      status: MedicineStatus.DRAFT,
      draftBranchId: scope.branchId,
      taxCategoryId: taxCategoryId ?? null,
    });
    return this.medicineRepo.save(medicine);
  }

  async promoteDraft(context: AuthContext, id: string): Promise<Medicine> {
    const scope = this.getTenantScope(context);
    const draft = await this.medicineRepo.findOne({
      where: { id, tenantId: scope.tenantId, status: MedicineStatus.DRAFT },
    });
    if (!draft) {
      throw new NotFoundException(`Draft medicine ${id} not found`);
    }
    // Check there's no canonical product with the same name
    const conflict = await this.medicineRepo.findOne({
      where: { name: draft.name, tenantId: scope.tenantId, status: MedicineStatus.CANONICAL },
    });
    if (conflict) {
      throw new ConflictException(
        `A canonical medicine named "${draft.name}" already exists (id: ${conflict.id}). Resolve the conflict before promoting.`,
      );
    }
    draft.status = MedicineStatus.CANONICAL;
    draft.draftBranchId = null;
    return this.medicineRepo.save(draft);
  }

  async dedupeCheck(
    context: AuthContext,
    query: DedupeCheckQueryDto,
  ): Promise<{ hints: DedupeHint[] }> {
    const scope = this.getTenantScope(context);
    // Trim once to avoid repeated .trim() calls
    const nameTrimmed = query.name?.trim() ?? "";
    const skuTrimmed = query.sku?.trim() ?? "";
    const barcodeTrimmed = query.barcode?.trim() ?? "";
    if (!nameTrimmed && !skuTrimmed && !barcodeTrimmed) {
      return { hints: [] };
    }

    type MatchField = { column: string; paramKey: string; value: string };
    const matchFields: MatchField[] = [
      ...(nameTrimmed
        ? [{ column: "m.name ILIKE :name", paramKey: "name", value: `%${nameTrimmed}%` }]
        : []),
      ...(skuTrimmed ? [{ column: "m.sku = :sku", paramKey: "sku", value: skuTrimmed }] : []),
      ...(barcodeTrimmed
        ? [{ column: "m.barcode = :barcode", paramKey: "barcode", value: barcodeTrimmed }]
        : []),
    ];

    const qb = this.medicineRepo.createQueryBuilder("m");
    qb.andWhere("m.tenantId = :tenantId", { tenantId: scope.tenantId });
    qb.andWhere(
      new Brackets((qb2) => {
        for (const [i, field] of matchFields.entries()) {
          const params = { [field.paramKey]: field.value };
          if (i === 0) qb2.where(field.column, params);
          else qb2.orWhere(field.column, params);
        }
      }),
    );
    qb.take(20);
    const matches = await qb.getMany();

    const hints: DedupeHint[] = matches.map((m) => {
      const matchedOn: ("name" | "sku" | "barcode")[] = [];
      if (nameTrimmed && m.name.toLowerCase().includes(nameTrimmed.toLowerCase())) {
        matchedOn.push("name");
      }
      if (skuTrimmed && m.sku === skuTrimmed) {
        matchedOn.push("sku");
      }
      if (barcodeTrimmed && m.barcode === barcodeTrimmed) {
        matchedOn.push("barcode");
      }
      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        barcode: m.barcode,
        status: m.status,
        draftBranchId: m.draftBranchId,
        matchedOn,
      };
    });
    return { hints };
  }

  /** Validates that a medicine is not a draft (for use by HQ Purchase Order services). */
  assertNotDraft(medicine: Medicine): void {
    if (medicine.status === MedicineStatus.DRAFT) {
      throw new BadRequestException(
        `Medicine "${medicine.name}" is a draft product and cannot be referenced on an HQ purchase order. Promote it to canonical first.`,
      );
    }
  }

  async update(context: AuthContext, id: string, dto: UpdateMedicineDto): Promise<Medicine> {
    const scope = this.getTenantScope(context);
    const medicine = await this.findCanonical(context, id);
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const other = await this.medicineRepo.findOne({
        where: { name, tenantId: scope.tenantId },
      });
      if (other && other.id !== id) {
        throw new ConflictException("A medicine with this name already exists");
      }
      medicine.name = name;
    }
    if (dto.sku !== undefined) {
      medicine.sku = dto.sku?.trim() || null;
    }
    if (dto.unit !== undefined) {
      medicine.unit = dto.unit?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      medicine.isActive = dto.isActive;
    }
    if (dto.taxCategoryId !== undefined) {
      const taxCategoryId = await this.resolveTaxCategoryId(scope.tenantId, dto.taxCategoryId);
      medicine.taxCategoryId = taxCategoryId ?? null;
    }
    return this.medicineRepo.save(medicine);
  }

  async updateOverlay(
    context: AuthContext,
    id: string,
    dto: UpdateMedicineOverlayDto,
  ): Promise<MedicineReadModel> {
    const scope = this.getBranchScope(context);
    const medicine = await this.findMedicineForBranch(context, id, scope.branchId);
    const overlay =
      (await this.overlayRepo.findOne({
        where: { tenantId: scope.tenantId, branchId: scope.branchId, medicineId: id },
      })) ??
      this.overlayRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId: id,
        stockQuantity: 0,
        reorderMin: null,
        reorderMax: null,
        binLocation: null,
        localPrice: null,
        localCost: null,
      });

    const nextMin = dto.reorderMin !== undefined ? (dto.reorderMin ?? null) : overlay.reorderMin;
    const nextMax = dto.reorderMax !== undefined ? (dto.reorderMax ?? null) : overlay.reorderMax;
    if (nextMin != null && nextMax != null && nextMin > nextMax) {
      throw new BadRequestException("Reorder minimum cannot exceed maximum");
    }
    overlay.reorderMin = nextMin;
    overlay.reorderMax = nextMax;
    if (dto.binLocation !== undefined) {
      overlay.binLocation = dto.binLocation?.trim() || null;
    }
    if (dto.localPrice !== undefined) {
      overlay.localPrice = dto.localPrice?.trim() || null;
    }
    if (dto.localCost !== undefined) {
      overlay.localCost = dto.localCost?.trim() || null;
    }
    const saved = await this.overlayRepo.save(overlay);
    return this.buildReadModel(medicine, saved);
  }

  async buy(
    context: AuthContext,
    medicineId: string,
    dto: BuyMedicineDto,
  ): Promise<MedicineTransaction> {
    const scope = this.getBranchScope(context);
    return this.medicineRepo.manager.transaction(async (manager) => {
      const medRepo = manager.getRepository(Medicine);
      const overlayRepo = manager.getRepository(MedicineOverlay);
      const transactionRepo = manager.getRepository(MedicineTransaction);
      const lotRepo = manager.getRepository(InventoryLot);
      const movementRepo = manager.getRepository(InventoryMovement);
      const medicine = await medRepo.findOne({
        where: { id: medicineId, tenantId: scope.tenantId },
      });
      if (!medicine) {
        throw new NotFoundException(`Medicine ${medicineId} not found`);
      }
      // Draft medicines can only be used by the branch that owns them
      if (medicine.status === MedicineStatus.DRAFT && medicine.draftBranchId !== scope.branchId) {
        throw new ForbiddenException(
          `Medicine "${medicine.name}" is a draft product owned by another branch`,
        );
      }
      const lotCode = dto.lotCode.trim();
      const expiryDate = dto.expiryDate;
      const unitCost = dto.unitPrice.trim();
      if (!lotCode) {
        throw new BadRequestException("Lot code is required");
      }
      if (!unitCost) {
        throw new BadRequestException("Unit cost is required");
      }
      const overrideReason = dto.expiryOverrideReason?.trim() || null;
      if (isLotExpired(expiryDate) && !overrideReason) {
        throw new BadRequestException(
          `Lot ${lotCode} is expired. Provide an override reason to receive it.`,
        );
      }

      let overlay = await overlayRepo.findOne({
        where: { medicineId, tenantId: scope.tenantId, branchId: scope.branchId },
        lock: { mode: "pessimistic_write" },
      });
      if (!overlay) {
        overlay = overlayRepo.create({
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId,
          stockQuantity: 0,
          reorderMin: null,
          reorderMax: null,
          binLocation: null,
          localPrice: null,
          localCost: null,
        });
      }
      overlay.stockQuantity += dto.quantity;
      overlay = await saveOverlayWithRetry(overlayRepo, overlay, dto.quantity, {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId,
      });

      let lot = await lotRepo.findOne({
        where: {
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId,
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
          medicineId,
          lotCode,
          expiryDate,
          unitCost,
          quantityOnHand: 0,
        });
      }
      lot.quantityOnHand += dto.quantity;
      lot = await saveLotWithRetry(lotRepo, lot, dto.quantity, {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId,
        lotCode,
        expiryDate,
        unitCost,
      });
      const taxLine = await this.buildLineTax(manager, scope, medicine, dto.quantity, unitCost);
      const row = transactionRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId,
        type: MedicineTransactionType.BUY,
        quantity: dto.quantity,
        unitPrice: unitCost,
        taxBase: taxLine.taxBase,
        taxRate: taxLine.taxRate,
        taxAmount: taxLine.taxAmount,
        recordedAt: new Date(dto.recordedAt),
        patientId: null,
        notes: dto.notes?.trim() || null,
      });
      const saved = await transactionRepo.save(row);
      const movement = movementRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId,
        lotId: lot.id,
        type: InventoryMovementType.RECEIPT,
        referenceType: InventoryMovementReferenceType.MANUAL_RECEIPT,
        referenceId: saved.id,
        quantity: dto.quantity,
        unitCost,
      });
      await movementRepo.save(movement);
      return saved;
    });
  }

  async sell(
    context: AuthContext,
    medicineId: string,
    dto: SellMedicineDto,
  ): Promise<MedicineTransaction> {
    const scope = this.getBranchScope(context);
    return this.medicineRepo.manager.transaction(async (manager) => {
      const medRepo = manager.getRepository(Medicine);
      const overlayRepo = manager.getRepository(MedicineOverlay);
      const transactionRepo = manager.getRepository(MedicineTransaction);
      const patRepo = manager.getRepository(Patient);
      const lotRepo = manager.getRepository(InventoryLot);
      const medicine = await medRepo.findOne({
        where: { id: medicineId, tenantId: scope.tenantId },
      });
      if (!medicine) {
        throw new NotFoundException(`Medicine ${medicineId} not found`);
      }
      // Draft medicines can only be used by the branch that owns them
      if (medicine.status === MedicineStatus.DRAFT && medicine.draftBranchId !== scope.branchId) {
        throw new ForbiddenException(
          `Medicine "${medicine.name}" is a draft product owned by another branch`,
        );
      }
      let overlay = await overlayRepo.findOne({
        where: { medicineId, tenantId: scope.tenantId, branchId: scope.branchId },
        lock: { mode: "pessimistic_write" },
      });
      if (!overlay) {
        overlay = overlayRepo.create({
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          medicineId,
          stockQuantity: 0,
          reorderMin: null,
          reorderMax: null,
          binLocation: null,
          localPrice: null,
          localCost: null,
        });
      }
      let patientId: string | null = null;
      if (dto.patientId) {
        const ok = await patRepo.exists({
          where: { id: dto.patientId, tenantId: scope.tenantId },
        });
        if (!ok) {
          throw new NotFoundException(`Patient ${dto.patientId} not found`);
        }
        patientId = dto.patientId;
      }
      const totalRow = await lotRepo
        .createQueryBuilder("lot")
        .select("SUM(lot.quantityOnHand)", "total")
        .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
        .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
        .andWhere("lot.medicineId = :medicineId", { medicineId })
        .getRawOne<{ total: string | null }>();
      const available = Number(totalRow?.total ?? 0);
      if (available > 0 && available < dto.quantity) {
        throw new ConflictException("Not enough stock");
      }
      if (available === 0 && overlay.stockQuantity < dto.quantity) {
        throw new ConflictException("Not enough stock");
      }
      if (available > 0) {
        let remaining = dto.quantity;
        while (remaining > 0) {
          const lot = await lotRepo
            .createQueryBuilder("lot")
            .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
            .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
            .andWhere("lot.medicineId = :medicineId", { medicineId })
            .andWhere("lot.quantityOnHand > 0")
            .orderBy("lot.expiryDate", "ASC")
            .addOrderBy("lot.createdAt", "ASC")
            .setLock("pessimistic_write")
            .getOne();
          if (!lot) {
            break;
          }
          const take = Math.min(remaining, lot.quantityOnHand);
          lot.quantityOnHand -= take;
          remaining -= take;
          await lotRepo.save(lot);
        }
        if (remaining > 0) {
          throw new ConflictException("Not enough stock");
        }
      }
      overlay.stockQuantity -= dto.quantity;
      await overlayRepo.save(overlay);
      const unitPrice = dto.unitPrice?.trim() || null;
      const taxLine = await this.buildLineTax(manager, scope, medicine, dto.quantity, unitPrice);
      const row = transactionRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId,
        type: MedicineTransactionType.SELL,
        quantity: dto.quantity,
        unitPrice,
        taxBase: taxLine.taxBase,
        taxRate: taxLine.taxRate,
        taxAmount: taxLine.taxAmount,
        recordedAt: new Date(dto.recordedAt),
        patientId,
        notes: dto.notes?.trim() || null,
      });
      return transactionRepo.save(row);
    });
  }

  async getTransactions(
    context: AuthContext,
    medicineId: string,
    options: { limit?: number; offset?: number },
  ): Promise<{ items: MedicineTransaction[]; total: number }> {
    const scope = this.getBranchScope(context);
    await this.findMedicineForBranch(context, medicineId, scope.branchId);
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, options.offset ?? 0);
    const [items, total] = await this.txRepo.findAndCount({
      where: { medicineId, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { patient: true },
      order: { recordedAt: "DESC" },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }
}
