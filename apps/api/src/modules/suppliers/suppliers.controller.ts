import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import type { CreateSupplierDto } from "./dto/create-supplier.dto";
import { SuppliersService } from "./suppliers.service";

@Controller()
@ApiTags("Suppliers")
@UseGuards(AuthGuard, RolesGuard)
export class SuppliersController {
  constructor(
    @Inject(SuppliersService)
    private readonly suppliersService: SuppliersService,
  ) {}

  @Get("suppliers")
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN)
  async list(@AuthContextParam() context: AuthContext) {
    return this.suppliersService.list(context);
  }

  @Post("suppliers")
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(context, dto);
  }
}
