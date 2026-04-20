import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApprovalInstance } from "../../entities/approval-instance.entity";
import { AuditEvent } from "../../entities/audit-event.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { Medicine } from "../../entities/medicine.entity";
import { SaleLine } from "../../entities/sale-line.entity";
import { TransferLine } from "../../entities/transfer-line.entity";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryLot,
      Medicine,
      SaleLine,
      TransferLine,
      ApprovalInstance,
      AuditEvent,
    ]),
    AuditEventsModule,
    TenancyModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
