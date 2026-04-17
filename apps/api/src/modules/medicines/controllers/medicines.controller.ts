import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import type { BuyMedicineDto, SellMedicineDto } from "../dto/medicine-transaction.dto";
import type { CreateMedicineDto, UpdateMedicineDto } from "../dto/medicine.dto";
import { MedicinesService } from "../services/medicines.service";

@Controller("medicines")
@ApiTags("Medicines")
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiQuery({ name: "includeInactive", required: false })
  async list(
    @Query("search") search?: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query("includeInactive", new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive?: boolean,
  ) {
    return this.medicinesService.list({
      search,
      limit,
      offset,
      includeInactive,
    });
  }

  @Post()
  async create(@Body() dto: CreateMedicineDto) {
    return this.medicinesService.create(dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.medicinesService.findOne(id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateMedicineDto) {
    return this.medicinesService.update(id, dto);
  }

  @Post(":id/buy")
  async buy(@Param("id") id: string, @Body() dto: BuyMedicineDto) {
    return this.medicinesService.buy(id, dto);
  }

  @Post(":id/sell")
  async sell(@Param("id") id: string, @Body() dto: SellMedicineDto) {
    return this.medicinesService.sell(id, dto);
  }

  @Get(":id/transactions")
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async transactions(
    @Param("id") id: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.medicinesService.getTransactions(id, { limit, offset });
  }
}
