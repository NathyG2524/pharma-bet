import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { TaxCategory } from "../../../entities/tax-category.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import type { CreateTaxCategoryDto } from "../dto/create-tax-category.dto";
import { normalizeTaxRate } from "../tax-rate";

@Injectable()
export class TaxCategoriesService {
  constructor(
    @InjectRepository(TaxCategory)
    private readonly taxCategoryRepo: Repository<TaxCategory>,
  ) {}

  private getTenantScope(context: AuthContext) {
    if (!context.tenantId) {
      throw new NotFoundException("Tenant context required");
    }
    return { tenantId: context.tenantId };
  }

  async list(context: AuthContext): Promise<TaxCategory[]> {
    const scope = this.getTenantScope(context);
    return this.taxCategoryRepo.find({
      where: { tenantId: scope.tenantId },
      order: { name: "ASC" },
    });
  }

  async create(context: AuthContext, dto: CreateTaxCategoryDto): Promise<TaxCategory> {
    const scope = this.getTenantScope(context);
    const name = dto.name.trim();
    const exists = await this.taxCategoryRepo.exists({
      where: { tenantId: scope.tenantId, name },
    });
    if (exists) {
      throw new ConflictException("Tax category name already exists");
    }
    const category = this.taxCategoryRepo.create({
      tenantId: scope.tenantId,
      name,
      rate: normalizeTaxRate(dto.rate),
    });
    return this.taxCategoryRepo.save(category);
  }
}
