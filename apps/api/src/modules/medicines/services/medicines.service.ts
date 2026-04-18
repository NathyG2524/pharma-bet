import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import { MedicineOverlay } from "../../../entities/medicine-overlay.entity";
import {
  MedicineTransaction,
  MedicineTransactionType,
} from "../../../entities/medicine-transaction.entity";
import { Medicine } from "../../../entities/medicine.entity";
import { Patient } from "../../../entities/patient.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import type { BuyMedicineDto } from "../dto/medicine-transaction.dto";
import type { SellMedicineDto } from "../dto/medicine-transaction.dto";
import type {
  CreateMedicineDto,
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  stockQuantity: number;
  reorderMin: number | null;
  reorderMax: number | null;
  binLocation: string | null;
  localPrice: string | null;
  localCost: string | null;
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
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
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

  private buildReadModel(medicine: Medicine, overlay?: MedicineOverlay | null): MedicineReadModel {
    return {
      id: medicine.id,
      name: medicine.name,
      sku: medicine.sku,
      unit: medicine.unit,
      isActive: medicine.isActive,
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
      where: { id, tenantId: scope.tenantId },
    });
    if (!medicine) {
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

  async findOne(context: AuthContext, id: string): Promise<MedicineReadModel> {
    const scope = this.getBranchScope(context);
    const medicine = await this.findCanonical(context, id);
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
    const medicine = this.medicineRepo.create({
      tenantId: scope.tenantId,
      name,
      sku: dto.sku?.trim() || null,
      unit: dto.unit?.trim() || null,
      isActive: true,
    });
    return this.medicineRepo.save(medicine);
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
    return this.medicineRepo.save(medicine);
  }

  async updateOverlay(
    context: AuthContext,
    id: string,
    dto: UpdateMedicineOverlayDto,
  ): Promise<MedicineReadModel> {
    const scope = this.getBranchScope(context);
    const medicine = await this.findCanonical(context, id);
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
      const medicine = await medRepo.findOne({
        where: { id: medicineId, tenantId: scope.tenantId },
      });
      if (!medicine) {
        throw new NotFoundException(`Medicine ${medicineId} not found`);
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
      await overlayRepo.save(overlay);
      const row = transactionRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId,
        type: MedicineTransactionType.BUY,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice?.trim() || null,
        recordedAt: new Date(dto.recordedAt),
        patientId: null,
        notes: dto.notes?.trim() || null,
      });
      return transactionRepo.save(row);
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
      const medicine = await medRepo.findOne({
        where: { id: medicineId, tenantId: scope.tenantId },
      });
      if (!medicine) {
        throw new NotFoundException(`Medicine ${medicineId} not found`);
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
          where: { id: dto.patientId, tenantId: scope.tenantId, branchId: scope.branchId },
        });
        if (!ok) {
          throw new NotFoundException(`Patient ${dto.patientId} not found`);
        }
        patientId = dto.patientId;
      }
      if (overlay.stockQuantity < dto.quantity) {
        throw new ConflictException("Not enough stock");
      }
      overlay.stockQuantity -= dto.quantity;
      await overlayRepo.save(overlay);
      const row = transactionRepo.create({
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        medicineId,
        type: MedicineTransactionType.SELL,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice?.trim() || null,
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
    await this.findCanonical(context, medicineId);
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
