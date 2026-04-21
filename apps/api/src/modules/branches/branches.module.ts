import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "../../entities/branch.entity";
import { Invite } from "../../entities/invite.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { BranchesController } from "./branches.controller";
import { BranchesService } from "./branches.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, UserMembership, Invite]),
    AuditEventsModule,
    TenancyModule,
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
