import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { InventoryMovement } from "../../entities/inventory-movement.entity";
import { StockCountSession } from "../../entities/stock-count-session.entity";
import { StockCountVariance } from "../../entities/stock-count-variance.entity";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { StockCountsController } from "./stock-counts.controller";
import { StockCountsService } from "./stock-counts.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockCountSession,
      StockCountVariance,
      InventoryLot,
      InventoryMovement,
    ]),
    AuditEventsModule,
    ApprovalsModule,
    TenancyModule,
  ],
  controllers: [StockCountsController],
  providers: [StockCountsService],
  exports: [StockCountsService],
})
export class StockCountsModule {}
