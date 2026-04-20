import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import type { CreatePoPendingBranchApprovalDto } from "./dto/create-po-pending-branch-approval.dto";
import { NotificationsService } from "./notifications.service";

@Controller()
@ApiTags("Notifications")
@UseGuards(AuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("notifications")
  async list(@AuthContextParam() context: AuthContext) {
    return this.notificationsService.listForUser(context);
  }

  @Patch("notifications/:id/read")
  async markRead(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.notificationsService.markRead(context, id);
  }

  @Post("notifications/po-pending-branch-approval")
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN)
  async notifyPoPendingBranchApproval(
    @AuthContextParam() context: AuthContext,
    @Body() dto: CreatePoPendingBranchApprovalDto,
  ) {
    return this.notificationsService.notifyPoPendingBranchApproval(context, dto);
  }
}
