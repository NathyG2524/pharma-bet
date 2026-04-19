import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Supplier } from "../../entities/supplier.entity";
import type { AuthContext } from "../tenancy/auth-context";
import type { CreateSupplierDto } from "./dto/create-supplier.dto";

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  private getTenantScope(context: AuthContext) {
    if (!context.tenantId) {
      throw new NotFoundException("Tenant context required");
    }
    return { tenantId: context.tenantId };
  }

  async list(context: AuthContext): Promise<Supplier[]> {
    const scope = this.getTenantScope(context);
    return this.supplierRepo.find({ where: { tenantId: scope.tenantId }, order: { name: "ASC" } });
  }

  async create(context: AuthContext, dto: CreateSupplierDto): Promise<Supplier> {
    const scope = this.getTenantScope(context);
    const name = dto.name.trim();
    const exists = await this.supplierRepo.exists({
      where: { tenantId: scope.tenantId, name },
    });
    if (exists) {
      throw new ConflictException("Supplier name already exists");
    }
    const supplier = this.supplierRepo.create({
      tenantId: scope.tenantId,
      name,
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
    });
    return this.supplierRepo.save(supplier);
  }

  async findById(context: AuthContext, id: string): Promise<Supplier> {
    const scope = this.getTenantScope(context);
    const supplier = await this.supplierRepo.findOne({
      where: { tenantId: scope.tenantId, id },
    });
    if (!supplier) {
      throw new NotFoundException("Supplier not found");
    }
    return supplier;
  }
}
