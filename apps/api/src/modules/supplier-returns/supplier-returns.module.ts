import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { InventoryMovement } from "../../entities/inventory-movement.entity";
import { SupplierReturnLine } from "../../entities/supplier-return-line.entity";
import { SupplierReturn } from "../../entities/supplier-return.entity";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { SupplierReturnsController } from "./supplier-returns.controller";
import { SupplierReturnsService } from "./supplier-returns.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([SupplierReturn, SupplierReturnLine, InventoryLot, InventoryMovement]),
    AuditEventsModule,
    ApprovalsModule,
    TenancyModule,
  ],
  controllers: [SupplierReturnsController],
  providers: [SupplierReturnsService],
  exports: [SupplierReturnsService],
})
export class SupplierReturnsModule {}
