import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@ApiTags("Inventory")
@UseGuards(AuthGuard, BranchGuard)
export class InventoryController {
  constructor(
    @Inject(InventoryService)
    private readonly inventoryService: InventoryService,
  ) {}

  @Get("lots")
  @ApiQuery({ name: "medicineId", required: false })
  async listLots(
    @AuthContextParam() context: AuthContext,
    @Query("medicineId") medicineId?: string,
  ) {
    return this.inventoryService.listLots(context, { medicineId });
  }

  @Get("valuation")
  async valuation(@AuthContextParam() context: AuthContext) {
    return this.inventoryService.getBranchValuation(context);
  }
}
