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
import type { AuthContext } from "../../tenancy/auth-context";
import { AuthContextParam } from "../../tenancy/auth.decorators";
import { AuthGuard } from "../../tenancy/auth.guard";
import { BranchGuard } from "../../tenancy/branch.guard";
import type { BuyMedicineDto, SellMedicineDto } from "../dto/medicine-transaction.dto";
import type { CreateMedicineDto, UpdateMedicineDto } from "../dto/medicine.dto";
import { MedicinesService } from "../services/medicines.service";

@Controller("medicines")
@ApiTags("Medicines")
@UseGuards(AuthGuard, BranchGuard)
export class MedicinesController {
  constructor(
    @Inject(MedicinesService)
    private readonly medicinesService: MedicinesService,
  ) {}

  @Get()
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

  @Post()
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateMedicineDto) {
    return this.medicinesService.create(context, dto);
  }

  @Get(":id")
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.medicinesService.findOne(context, id);
  }

  @Patch(":id")
  async update(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.medicinesService.update(context, id, dto);
  }

  @Post(":id/buy")
  async buy(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: BuyMedicineDto,
  ) {
    return this.medicinesService.buy(context, id, dto);
  }

  @Post(":id/sell")
  async sell(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: SellMedicineDto,
  ) {
    return this.medicinesService.sell(context, id, dto);
  }

  @Get(":id/transactions")
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
