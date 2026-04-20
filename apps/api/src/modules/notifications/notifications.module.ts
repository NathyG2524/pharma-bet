import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "../../entities/branch.entity";
import { Notification } from "../../entities/notification.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { TenancyModule } from "../tenancy/tenancy.module";
import { NotificationEmailService } from "./notification-email.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [TypeOrmModule.forFeature([Notification, UserMembership, Branch]), TenancyModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
