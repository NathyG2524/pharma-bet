import { Body, Controller, Get, Inject, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../../entities/user-membership.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import { AuthContextParam, Roles } from "../../tenancy/auth.decorators";
import { AuthGuard } from "../../tenancy/auth.guard";
import { RolesGuard } from "../../tenancy/roles.guard";
import type { UpdateBranchTaxSettingsDto } from "../dto/update-branch-tax-settings.dto";
import { BranchTaxSettingsService } from "../services/branch-tax-settings.service";

@Controller("branches/:branchId/tax-settings")
@ApiTags("Branch tax settings")
@UseGuards(AuthGuard, RolesGuard)
export class BranchTaxSettingsController {
  constructor(
    @Inject(BranchTaxSettingsService)
    private readonly branchTaxSettingsService: BranchTaxSettingsService,
  ) {}

  @Get()
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN)
  async getSettings(@AuthContextParam() context: AuthContext, @Param("branchId") branchId: string) {
    return this.branchTaxSettingsService.getSettings(context, branchId);
  }

  @Patch()
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER)
  async updateSettings(
    @AuthContextParam() context: AuthContext,
    @Param("branchId") branchId: string,
    @Body() dto: UpdateBranchTaxSettingsDto,
  ) {
    return this.branchTaxSettingsService.upsertSettings(context, branchId, dto);
  }
}
