import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AllowTenantless, AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import type { CreateTenantDto } from "./dto/create-tenant.dto";
import { TenantsService } from "./tenants.service";

@Controller("tenants")
@ApiTags("Tenants")
@UseGuards(AuthGuard, RolesGuard)
export class TenantsController {
  constructor(
    @Inject(TenantsService)
    private readonly tenantsService: TenantsService,
  ) {}

  @Get()
  @AllowTenantless()
  async list(@AuthContextParam() context: AuthContext) {
    return this.tenantsService.listForUser(context);
  }

  @Post()
  @AllowTenantless()
  @Roles(UserRole.PLATFORM_ADMIN)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateTenantDto) {
    return this.tenantsService.create(context, dto);
  }

  @Get("hq-invites")
  @AllowTenantless()
  @Roles(UserRole.PLATFORM_ADMIN)
  async listPendingHqInvites(@Query("tenantId") tenantId?: string) {
    return this.tenantsService.listPendingHqInvites(tenantId);
  }

  @Post("hq-invites/:inviteId/revoke")
  @AllowTenantless()
  @Roles(UserRole.PLATFORM_ADMIN)
  async revokePendingHqInvite(
    @AuthContextParam() context: AuthContext,
    @Param("inviteId") inviteId: string,
  ) {
    return this.tenantsService.revokePendingHqInvite(context, inviteId);
  }
}
