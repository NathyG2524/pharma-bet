import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdjustmentsModule } from "./modules/adjustments/adjustments.module";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { AuditEventsModule } from "./modules/audit-events/audit-events.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { PurchaseOrdersModule } from "./modules/purchase-orders/purchase-orders.module";
import { SalesModule } from "./modules/sales/sales.module";
import { StockCountsModule } from "./modules/stock-counts/stock-counts.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { TaxesModule } from "./modules/taxes/taxes.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { TransfersModule } from "./modules/transfers/transfers.module";
import { typeOrmConfig } from "./typeorm-config";

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TenancyModule,
    TenantsModule,
    AuditEventsModule,
    ApprovalsModule,
    BranchesModule,
    PatientsModule,
    MedicinesModule,
    NotificationsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    TaxesModule,
    InventoryModule,
    SalesModule,
    TransfersModule,
    AdjustmentsModule,
    StockCountsModule,
  ],
})
export class AppModule {}
