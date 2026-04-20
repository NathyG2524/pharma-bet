import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditEventsModule } from "./modules/audit-events/audit-events.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { PurchaseOrdersModule } from "./modules/purchase-orders/purchase-orders.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { TaxesModule } from "./modules/taxes/taxes.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { typeOrmConfig } from "./typeorm-config";

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TenancyModule,
    TenantsModule,
    AuditEventsModule,
    BranchesModule,
    PatientsModule,
    MedicinesModule,
    NotificationsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    TaxesModule,
  ],
})
export class AppModule {}
