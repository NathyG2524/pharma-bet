import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { BRANCH_ROLES } from "../tenancy/role-utils";
import { RolesGuard } from "../tenancy/roles.guard";
import type { CreateSaleDto } from "./dto/create-sale.dto";
import { SalesService } from "./sales.service";

@Controller("sales")
@ApiTags("Sales")
@UseGuards(AuthGuard, BranchGuard, RolesGuard)
export class SalesController {
  constructor(
    @Inject(SalesService)
    private readonly salesService: SalesService,
  ) {}

  @Post()
  @Roles(...BRANCH_ROLES)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateSaleDto) {
    return this.salesService.createSale(context, dto);
  }
}
