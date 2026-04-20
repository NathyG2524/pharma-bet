import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchTaxSetting } from "../../entities/branch-tax-setting.entity";
import { Branch } from "../../entities/branch.entity";
import { TaxCategory } from "../../entities/tax-category.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { BranchTaxSettingsController } from "./controllers/branch-tax-settings.controller";
import { TaxCategoriesController } from "./controllers/tax-categories.controller";
import { BranchTaxSettingsService } from "./services/branch-tax-settings.service";
import { TaxCategoriesService } from "./services/tax-categories.service";

@Module({
  imports: [TypeOrmModule.forFeature([TaxCategory, BranchTaxSetting, Branch]), TenancyModule],
  controllers: [TaxCategoriesController, BranchTaxSettingsController],
  providers: [TaxCategoriesService, BranchTaxSettingsService],
})
export class TaxesModule {}
