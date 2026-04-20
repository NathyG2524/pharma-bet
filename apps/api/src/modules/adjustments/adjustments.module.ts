import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryAdjustment } from "../../entities/inventory-adjustment.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { InventoryMovement } from "../../entities/inventory-movement.entity";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AdjustmentsController } from "./adjustments.controller";
import { AdjustmentsService } from "./adjustments.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryAdjustment, InventoryLot, InventoryMovement]),
    AuditEventsModule,
    ApprovalsModule,
    TenancyModule,
  ],
  controllers: [AdjustmentsController],
  providers: [AdjustmentsService],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
