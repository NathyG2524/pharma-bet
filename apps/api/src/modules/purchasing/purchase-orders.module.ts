import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "../../entities/branch.entity";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { InventoryMovement } from "../../entities/inventory-movement.entity";
import { MedicineOverlay } from "../../entities/medicine-overlay.entity";
import { Medicine } from "../../entities/medicine.entity";
import { PurchaseOrderLine } from "../../entities/purchase-order-line.entity";
import { PurchaseOrderReceiptLine } from "../../entities/purchase-order-receipt-line.entity";
import { PurchaseOrderReceipt } from "../../entities/purchase-order-receipt.entity";
import { PurchaseOrder } from "../../entities/purchase-order.entity";
import { MedicinesModule } from "../medicines/medicines.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { PurchaseOrdersController } from "./purchase-orders.controller";
import { PurchaseOrdersService } from "./purchase-orders.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderLine,
      PurchaseOrderReceipt,
      PurchaseOrderReceiptLine,
      Branch,
      Medicine,
      MedicineOverlay,
      InventoryLot,
      InventoryMovement,
    ]),
    TenancyModule,
    MedicinesModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
