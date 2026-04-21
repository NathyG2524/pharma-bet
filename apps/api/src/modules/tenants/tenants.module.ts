import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite } from "../../entities/invite.entity";
import { Tenant } from "../../entities/tenant.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, UserMembership, Invite]),
    AuditEventsModule,
    TenancyModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
