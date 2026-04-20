import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchTaxSetting } from "../../entities/branch-tax-setting.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { MedicineOverlay } from "../../entities/medicine-overlay.entity";
import { Medicine } from "../../entities/medicine.entity";
import { Patient } from "../../entities/patient.entity";
import { SaleLineAllocation } from "../../entities/sale-line-allocation.entity";
import { SaleLine } from "../../entities/sale-line.entity";
import { Sale } from "../../entities/sale.entity";
import { TaxCategory } from "../../entities/tax-category.entity";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleLine,
      SaleLineAllocation,
      Medicine,
      MedicineOverlay,
      InventoryLot,
      Patient,
      BranchTaxSetting,
      TaxCategory,
    ]),
    AuditEventsModule,
    TenancyModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
