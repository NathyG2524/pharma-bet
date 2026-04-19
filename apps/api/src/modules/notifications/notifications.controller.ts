import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { NotificationsService } from "./notifications.service";

@Controller()
@ApiTags("Notifications")
@UseGuards(AuthGuard, BranchGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("notifications")
  async list(@AuthContextParam() context: AuthContext) {
    return this.notificationsService.listForBranch(context);
  }
}
