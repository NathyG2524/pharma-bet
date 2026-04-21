import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Invite } from "../../entities/invite.entity";
import { UserMembership } from "../../entities/user-membership.entity";
import { User } from "../../entities/user.entity";
import { AuditEventsModule } from "../audit-events/audit-events.module";
import { AuthModule } from "../auth/auth.module";
import { InvitesController } from "./invites.controller";
import { InvitesService } from "./invites.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Invite, User, UserMembership]),
    AuthModule,
    AuditEventsModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
