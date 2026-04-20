import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "../../entities/branch.entity";
import { Medicine } from "../../entities/medicine.entity";
import { PurchaseOrderEvent } from "../../entities/purchase-order-event.entity";
import { PurchaseOrderLine } from "../../entities/purchase-order-line.entity";
import { PurchaseOrder } from "../../entities/purchase-order.entity";
import { Supplier } from "../../entities/supplier.entity";
import { MedicinesModule } from "../medicines/medicines.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { PurchaseOrdersController } from "./purchase-orders.controller";
import { PurchaseOrdersService } from "./purchase-orders.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderLine,
      PurchaseOrderEvent,
      Supplier,
      Branch,
      Medicine,
    ]),
    TenancyModule,
    MedicinesModule,
    NotificationsModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
