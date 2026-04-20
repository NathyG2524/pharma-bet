import { Body, Controller, Get, Inject, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { HQ_ROLES } from "../tenancy/role-utils";
import { RolesGuard } from "../tenancy/roles.guard";
import type { UpdateLotStatusDto } from "./dto/update-lot-status.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@ApiTags("Inventory")
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(
    @Inject(InventoryService)
    private readonly inventoryService: InventoryService,
  ) {}

  @Get("lots")
  @UseGuards(BranchGuard)
  @ApiQuery({ name: "medicineId", required: false })
  async listLots(
    @AuthContextParam() context: AuthContext,
    @Query("medicineId") medicineId?: string,
  ) {
    return this.inventoryService.listLots(context, { medicineId });
  }

  @Get("valuation")
  @UseGuards(BranchGuard)
  async valuation(@AuthContextParam() context: AuthContext) {
    return this.inventoryService.getBranchValuation(context);
  }

  @Get("org-on-hand")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async orgOnHand(@AuthContextParam() context: AuthContext) {
    return this.inventoryService.getOrgOnHand(context);
  }

  @Patch("lots/:id/status")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...HQ_ROLES)
  async updateLotStatus(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: UpdateLotStatusDto,
  ) {
    return this.inventoryService.updateLotStatus(context, id, dto);
  }
}
