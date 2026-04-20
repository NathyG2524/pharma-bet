import { Body, Controller, Get, Inject, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { HQ_ROLES } from "../tenancy/role-utils";
import { RolesGuard } from "../tenancy/roles.guard";
import type { InventoryReportQueryDto } from "./dto/inventory-report-query.dto";
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

  @Get("reports/expiry-horizon")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "startDate", required: false, description: "ISO date/time filter start" })
  @ApiQuery({ name: "endDate", required: false, description: "ISO date/time filter end" })
  async expiryHorizonReport(
    @AuthContextParam() context: AuthContext,
    @Query() query: InventoryReportQueryDto,
  ) {
    return this.inventoryService.getExpiryHorizonReport(context, query);
  }

  @Get("reports/stock-valuation")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "startDate", required: false, description: "ISO date/time filter start" })
  @ApiQuery({ name: "endDate", required: false, description: "ISO date/time filter end" })
  async stockValuationReport(
    @AuthContextParam() context: AuthContext,
    @Query() query: InventoryReportQueryDto,
  ) {
    return this.inventoryService.getStockValuationReport(context, query);
  }

  @Get("reports/exceptions")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES, UserRole.BRANCH_MANAGER)
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "startDate", required: false, description: "ISO date/time filter start" })
  @ApiQuery({ name: "endDate", required: false, description: "ISO date/time filter end" })
  async exceptionsReport(
    @AuthContextParam() context: AuthContext,
    @Query() query: InventoryReportQueryDto,
  ) {
    return this.inventoryService.getExceptionsReport(context, query);
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
