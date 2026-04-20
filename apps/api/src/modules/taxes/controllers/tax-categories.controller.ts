import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../../entities/user-membership.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import { AuthContextParam, Roles } from "../../tenancy/auth.decorators";
import { AuthGuard } from "../../tenancy/auth.guard";
import { RolesGuard } from "../../tenancy/roles.guard";
import type { CreateTaxCategoryDto } from "../dto/create-tax-category.dto";
import { TaxCategoriesService } from "../services/tax-categories.service";

@Controller("tax-categories")
@ApiTags("Tax categories")
@UseGuards(AuthGuard, RolesGuard)
export class TaxCategoriesController {
  constructor(
    @Inject(TaxCategoriesService)
    private readonly taxCategoriesService: TaxCategoriesService,
  ) {}

  @Get()
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN)
  async list(@AuthContextParam() context: AuthContext) {
    return this.taxCategoriesService.list(context);
  }

  @Post()
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateTaxCategoryDto) {
    return this.taxCategoriesService.create(context, dto);
  }
}
