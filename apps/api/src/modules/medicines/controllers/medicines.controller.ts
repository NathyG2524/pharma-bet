import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../../entities/user-membership.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import { AuthContextParam, Roles } from "../../tenancy/auth.decorators";
import { AuthGuard } from "../../tenancy/auth.guard";
import { BranchGuard } from "../../tenancy/branch.guard";
import { RolesGuard } from "../../tenancy/roles.guard";
import type { BuyMedicineDto, SellMedicineDto } from "../dto/medicine-transaction.dto";
import type {
  CreateMedicineDto,
  UpdateMedicineDto,
  UpdateMedicineOverlayDto,
} from "../dto/medicine.dto";
import { MedicinesService } from "../services/medicines.service";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BRANCH_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];

@Controller("medicines")
@ApiTags("Medicines")
@UseGuards(AuthGuard)
export class MedicinesController {
  constructor(
    @Inject(MedicinesService)
    private readonly medicinesService: MedicinesService,
  ) {}

  @Get("catalog")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiQuery({ name: "includeInactive", required: false })
  async listCatalog(
    @AuthContextParam() context: AuthContext,
    @Query("search") search?: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query("includeInactive", new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive?: boolean,
  ) {
    return this.medicinesService.listCanonical(context, {
      search,
      limit,
      offset,
      includeInactive,
    });
  }

  @Post("catalog")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async createCatalog(@AuthContextParam() context: AuthContext, @Body() dto: CreateMedicineDto) {
    return this.medicinesService.create(context, dto);
  }

  @Get("catalog/:id")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async findCatalogOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.medicinesService.findCanonicalOne(context, id);
  }

  @Patch("catalog/:id")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async updateCatalog(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.medicinesService.update(context, id, dto);
  }

  @Get()
  @UseGuards(BranchGuard)
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiQuery({ name: "includeInactive", required: false })
  async list(
    @AuthContextParam() context: AuthContext,
    @Query("search") search?: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query("includeInactive", new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive?: boolean,
  ) {
    return this.medicinesService.list(context, {
      search,
      limit,
      offset,
      includeInactive,
    });
  }

  @Get(":id")
  @UseGuards(BranchGuard)
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.medicinesService.findOne(context, id);
  }

  @Patch(":id/overlay")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async updateOverlay(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: UpdateMedicineOverlayDto,
  ) {
    return this.medicinesService.updateOverlay(context, id, dto);
  }

  @Post(":id/buy")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async buy(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: BuyMedicineDto,
  ) {
    return this.medicinesService.buy(context, id, dto);
  }

  @Post(":id/sell")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async sell(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: SellMedicineDto,
  ) {
    return this.medicinesService.sell(context, id, dto);
  }

  @Get(":id/transactions")
  @UseGuards(BranchGuard)
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async transactions(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.medicinesService.getTransactions(context, id, { limit, offset });
  }
}
