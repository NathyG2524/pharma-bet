import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchesModule } from "./modules/branches/branches.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { TaxesModule } from "./modules/taxes/taxes.module";
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
    TaxesModule,
  ],
})
export class AppModule {}
