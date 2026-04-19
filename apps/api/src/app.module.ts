import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchesModule } from "./modules/branches/branches.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { PurchaseOrdersModule } from "./modules/purchase-orders/purchase-orders.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { typeOrmConfig } from "./typeorm-config";

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TenancyModule,
    TenantsModule,
    BranchesModule,
    PatientsModule,
    MedicinesModule,
    SuppliersModule,
    PurchaseOrdersModule,
    NotificationsModule,
  ],
})
export class AppModule {}
