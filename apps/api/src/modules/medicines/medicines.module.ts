import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchTaxSetting } from "../../entities/branch-tax-setting.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { InventoryMovement } from "../../entities/inventory-movement.entity";
import { MedicineOverlay } from "../../entities/medicine-overlay.entity";
import { MedicineTransaction } from "../../entities/medicine-transaction.entity";
import { Medicine } from "../../entities/medicine.entity";
import { Patient } from "../../entities/patient.entity";
import { TaxCategory } from "../../entities/tax-category.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { MedicinesController } from "./controllers/medicines.controller";
import { MedicinesService } from "./services/medicines.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Medicine,
      MedicineOverlay,
      MedicineTransaction,
      Patient,
      InventoryLot,
      InventoryMovement,
      TaxCategory,
      BranchTaxSetting,
    ]),
    TenancyModule,
  ],
  controllers: [MedicinesController],
  providers: [MedicinesService],
  exports: [MedicinesService],
})
export class MedicinesModule {}
