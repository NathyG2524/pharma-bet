import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "../../entities/branch.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { MedicineOverlay } from "../../entities/medicine-overlay.entity";
import { Medicine } from "../../entities/medicine.entity";
import { TransferLineAllocation } from "../../entities/transfer-line-allocation.entity";
import { TransferLine } from "../../entities/transfer-line.entity";
import { Transfer } from "../../entities/transfer.entity";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transfer,
      TransferLine,
      TransferLineAllocation,
      Branch,
      Medicine,
      InventoryLot,
      MedicineOverlay,
    ]),
    AuditEventsModule,
    TenancyModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
