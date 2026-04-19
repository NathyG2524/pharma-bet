import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { BranchTaxSetting } from "../../../entities/branch-tax-setting.entity";
import { Branch } from "../../../entities/branch.entity";
import { TaxCategory } from "../../../entities/tax-category.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import type { UpdateBranchTaxSettingsDto } from "../dto/update-branch-tax-settings.dto";

@Injectable()
export class BranchTaxSettingsService {
  constructor(
    @InjectRepository(BranchTaxSetting)
    private readonly branchTaxRepo: Repository<BranchTaxSetting>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(TaxCategory)
    private readonly taxCategoryRepo: Repository<TaxCategory>,
  ) {}

  private getTenantScope(context: AuthContext) {
    if (!context.tenantId) {
      throw new NotFoundException("Tenant context required");
    }
    return { tenantId: context.tenantId };
  }

  private normalizeRate(rate: string): string {
    const parsed = Number.parseFloat(rate);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException("Tax rate must be a valid number");
    }
    if (parsed < 0 || parsed > 1) {
      throw new BadRequestException("Tax rate must be between 0 and 1");
    }
    return parsed.toFixed(4);
  }

  private async assertBranch(tenantId: string, branchId: string): Promise<void> {
    const branch = await this.branchRepo.findOne({
      where: { tenantId, id: branchId },
      select: ["id"],
    });
    if (!branch) {
      throw new NotFoundException("Branch not found for tenant");
    }
  }

  async getSettings(context: AuthContext, branchId: string): Promise<BranchTaxSetting> {
    const scope = this.getTenantScope(context);
    await this.assertBranch(scope.tenantId, branchId);
    const existing = await this.branchTaxRepo.findOne({
      where: { tenantId: scope.tenantId, branchId },
    });
    if (existing) {
      return existing;
    }
    const created = this.branchTaxRepo.create({
      tenantId: scope.tenantId,
      branchId,
      defaultTaxCategoryId: null,
      taxRateOverride: null,
    });
    return this.branchTaxRepo.save(created);
  }

  async upsertSettings(
    context: AuthContext,
    branchId: string,
    dto: UpdateBranchTaxSettingsDto,
  ): Promise<BranchTaxSetting> {
    const scope = this.getTenantScope(context);
    await this.assertBranch(scope.tenantId, branchId);
    const existing =
      (await this.branchTaxRepo.findOne({
        where: { tenantId: scope.tenantId, branchId },
      })) ??
      this.branchTaxRepo.create({
        tenantId: scope.tenantId,
        branchId,
        defaultTaxCategoryId: null,
        taxRateOverride: null,
      });

    if (dto.defaultTaxCategoryId !== undefined) {
      if (dto.defaultTaxCategoryId === null) {
        existing.defaultTaxCategoryId = null;
      } else {
        const category = await this.taxCategoryRepo.findOne({
          where: { tenantId: scope.tenantId, id: dto.defaultTaxCategoryId },
          select: ["id"],
        });
        if (!category) {
          throw new BadRequestException("Tax category not found for tenant");
        }
        existing.defaultTaxCategoryId = category.id;
      }
    }

    if (dto.taxRateOverride !== undefined) {
      existing.taxRateOverride =
        dto.taxRateOverride === null ? null : this.normalizeRate(dto.taxRateOverride);
    }

    return this.branchTaxRepo.save(existing);
  }
}
