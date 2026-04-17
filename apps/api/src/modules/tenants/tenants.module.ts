import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tenant } from "../../entities/tenant.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, UserMembership]), TenancyModule],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
