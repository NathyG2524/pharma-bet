import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import { AuditEventsService } from "./audit-events.service";
import type { ListAuditEventsDto } from "./dto/list-audit-events.dto";

@Controller("audit-events")
@ApiTags("Audit Events")
@UseGuards(AuthGuard, RolesGuard)
export class AuditEventsController {
  constructor(
    @Inject(AuditEventsService)
    private readonly auditEventsService: AuditEventsService,
  ) {}

  @Get()
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN)
  async list(@AuthContextParam() context: AuthContext, @Query() query: ListAuditEventsDto) {
    return this.auditEventsService.listForContext(context, query);
  }
}
