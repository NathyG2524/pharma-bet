import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Medicine, MedicineStatus } from "../../../entities/medicine.entity";
import { SupplierProduct } from "../../../entities/supplier-product.entity";
import { Supplier } from "../../../entities/supplier.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import type {
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
} from "../dto/supplier-product.dto";
import type { CreateSupplierDto, UpdateSupplierDto } from "../dto/supplier.dto";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type SupplierReadModel = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SupplierProductReadModel = {
  id: string;
  supplierId: string;
  medicineId: string;
  supplierSku: string | null;
  packSize: number | null;
  packUnit: string | null;
  createdAt: Date;
  updatedAt: Date;
  medicine: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  } | null;
};

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private readonly supplierProductRepo: Repository<SupplierProduct>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
  ) {}

  private getTenantScope(context: AuthContext) {
    if (!context.tenantId) {
      throw new NotFoundException("Tenant context required");
    }
    return { tenantId: context.tenantId };
  }

  private buildSupplierReadModel(supplier: Supplier): SupplierReadModel {
    return {
      id: supplier.id,
      name: supplier.name,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      address: supplier.address,
      notes: supplier.notes,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  private buildSupplierProductReadModel(mapping: SupplierProduct): SupplierProductReadModel {
    const medicine = mapping.medicine
      ? {
          id: mapping.medicine.id,
          name: mapping.medicine.name,
          sku: mapping.medicine.sku,
          unit: mapping.medicine.unit,
        }
      : null;
    return {
      id: mapping.id,
      supplierId: mapping.supplierId,
      medicineId: mapping.medicineId,
      supplierSku: mapping.supplierSku,
      packSize: mapping.packSize,
      packUnit: mapping.packUnit,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
      medicine,
    };
  }

  private async findSupplier(context: AuthContext, id: string): Promise<Supplier> {
    const scope = this.getTenantScope(context);
    const supplier = await this.supplierRepo.findOne({
      where: { id, tenantId: scope.tenantId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    return supplier;
  }

  private async findCanonicalMedicine(context: AuthContext, id: string): Promise<Medicine> {
    const scope = this.getTenantScope(context);
    const medicine = await this.medicineRepo.findOne({
      where: { id, tenantId: scope.tenantId, status: MedicineStatus.CANONICAL },
    });
    if (!medicine) {
      throw new NotFoundException(`Medicine ${id} not found`);
    }
    return medicine;
  }

  async listSuppliers(
    context: AuthContext,
    options: { search?: string; limit?: number; offset?: number },
  ): Promise<{ items: SupplierReadModel[]; total: number }> {
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, options.offset ?? 0);
    const scope = this.getTenantScope(context);
    const qb = this.supplierRepo.createQueryBuilder("s");
    qb.andWhere("s.tenantId = :tenantId", { tenantId: scope.tenantId });
    if (options.search?.trim()) {
      qb.andWhere("s.name ILIKE :search", { search: `%${options.search.trim()}%` });
    }
    qb.orderBy("s.name", "ASC").skip(offset).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((supplier) => this.buildSupplierReadModel(supplier)), total };
  }

  async createSupplier(context: AuthContext, dto: CreateSupplierDto): Promise<SupplierReadModel> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("Supplier name is required");
    }
    const scope = this.getTenantScope(context);
    const exists = await this.supplierRepo.exists({
      where: { tenantId: scope.tenantId, name },
    });
    if (exists) {
      throw new ConflictException("Supplier name already exists");
    }
    const supplier = this.supplierRepo.create({
      tenantId: scope.tenantId,
      name,
      contactEmail: dto.contactEmail?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
    });
    const saved = await this.supplierRepo.save(supplier);
    return this.buildSupplierReadModel(saved);
  }

  async getSupplier(context: AuthContext, id: string): Promise<SupplierReadModel> {
    const supplier = await this.findSupplier(context, id);
    return this.buildSupplierReadModel(supplier);
  }

  async updateSupplier(
    context: AuthContext,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierReadModel> {
    const supplier = await this.findSupplier(context, id);
    if (dto.name !== undefined) {
      const name = dto.name?.trim() ?? "";
      if (!name) {
        throw new BadRequestException("Supplier name is required");
      }
      if (name !== supplier.name) {
        const exists = await this.supplierRepo.exists({
          where: { tenantId: supplier.tenantId, name },
        });
        if (exists) {
          throw new ConflictException("Supplier name already exists");
        }
        supplier.name = name;
      }
    }
    if (dto.contactEmail !== undefined) {
      supplier.contactEmail = dto.contactEmail?.trim() || null;
    }
    if (dto.contactPhone !== undefined) {
      supplier.contactPhone = dto.contactPhone?.trim() || null;
    }
    if (dto.address !== undefined) {
      supplier.address = dto.address?.trim() || null;
    }
    if (dto.notes !== undefined) {
      supplier.notes = dto.notes?.trim() || null;
    }
    const saved = await this.supplierRepo.save(supplier);
    return this.buildSupplierReadModel(saved);
  }

  async deleteSupplier(context: AuthContext, id: string): Promise<void> {
    const supplier = await this.findSupplier(context, id);
    await this.supplierRepo.remove(supplier);
  }

  async listMappings(
    context: AuthContext,
    supplierId: string,
    options: { search?: string; limit?: number; offset?: number },
  ): Promise<{ items: SupplierProductReadModel[]; total: number }> {
    const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const offset = Math.max(0, options.offset ?? 0);
    const scope = this.getTenantScope(context);
    await this.findSupplier(context, supplierId);
    const qb = this.supplierProductRepo.createQueryBuilder("mapping");
    qb.leftJoinAndSelect("mapping.medicine", "medicine");
    qb.andWhere("mapping.tenantId = :tenantId", { tenantId: scope.tenantId });
    qb.andWhere("mapping.supplierId = :supplierId", { supplierId });
    if (options.search?.trim()) {
      qb.andWhere(
        "(medicine.name ILIKE :search OR medicine.sku ILIKE :search OR mapping.supplierSku ILIKE :search)",
        { search: `%${options.search.trim()}%` },
      );
    }
    qb.orderBy("medicine.name", "ASC").skip(offset).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((mapping) => this.buildSupplierProductReadModel(mapping)), total };
  }

  async createMapping(
    context: AuthContext,
    supplierId: string,
    dto: CreateSupplierProductDto,
  ): Promise<SupplierProductReadModel> {
    const scope = this.getTenantScope(context);
    await this.findSupplier(context, supplierId);
    const medicine = await this.findCanonicalMedicine(context, dto.medicineId);
    const exists = await this.supplierProductRepo.exists({
      where: {
        tenantId: scope.tenantId,
        supplierId,
        medicineId: medicine.id,
      },
    });
    if (exists) {
      throw new ConflictException("Supplier mapping already exists for this medicine");
    }
    const mapping = this.supplierProductRepo.create({
      tenantId: scope.tenantId,
      supplierId,
      medicineId: medicine.id,
      supplierSku: dto.supplierSku?.trim() || null,
      packSize: dto.packSize ?? null,
      packUnit: dto.packUnit?.trim() || null,
    });
    const saved = await this.supplierProductRepo.save(mapping);
    saved.medicine = medicine;
    return this.buildSupplierProductReadModel(saved);
  }

  async updateMapping(
    context: AuthContext,
    supplierId: string,
    mappingId: string,
    dto: UpdateSupplierProductDto,
  ): Promise<SupplierProductReadModel> {
    const scope = this.getTenantScope(context);
    const mapping = await this.supplierProductRepo.findOne({
      where: { id: mappingId, tenantId: scope.tenantId, supplierId },
      relations: { medicine: true },
    });
    if (!mapping) {
      throw new NotFoundException("Supplier mapping not found");
    }
    if (dto.supplierSku !== undefined) {
      mapping.supplierSku = dto.supplierSku?.trim() || null;
    }
    if (dto.packSize !== undefined) {
      mapping.packSize = dto.packSize ?? null;
    }
    if (dto.packUnit !== undefined) {
      mapping.packUnit = dto.packUnit?.trim() || null;
    }
    const saved = await this.supplierProductRepo.save(mapping);
    return this.buildSupplierProductReadModel(saved);
  }

  async deleteMapping(context: AuthContext, supplierId: string, mappingId: string): Promise<void> {
    const scope = this.getTenantScope(context);
    const mapping = await this.supplierProductRepo.findOne({
      where: { id: mappingId, tenantId: scope.tenantId, supplierId },
    });
    if (!mapping) {
      throw new NotFoundException("Supplier mapping not found");
    }
    await this.supplierProductRepo.remove(mapping);
  }
}
