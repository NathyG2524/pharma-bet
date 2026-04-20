import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApprovalInstance } from "../../entities/approval-instance.entity";
import { Branch } from "../../entities/branch.entity";
import { TenantApprovalPolicy } from "../../entities/tenant-approval-policy.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalInstance, TenantApprovalPolicy, UserMembership, Branch]),
    TenancyModule,
    AuditEventsModule,
    NotificationsModule,
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
