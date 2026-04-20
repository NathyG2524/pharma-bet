import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
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
import { RolesGuard } from "../../tenancy/roles.guard";
import type {
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
} from "../dto/supplier-product.dto";
import type { CreateSupplierDto, UpdateSupplierDto } from "../dto/supplier.dto";
import { SuppliersService } from "../services/suppliers.service";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];

@Controller("suppliers")
@ApiTags("Suppliers")
@UseGuards(AuthGuard)
export class SuppliersController {
  constructor(
    @Inject(SuppliersService)
    private readonly suppliersService: SuppliersService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async listSuppliers(
    @AuthContextParam() context: AuthContext,
    @Query("search") search?: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.suppliersService.listSuppliers(context, { search, limit, offset });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async createSupplier(@AuthContextParam() context: AuthContext, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.createSupplier(context, dto);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async getSupplier(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.suppliersService.getSupplier(context, id);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async updateSupplier(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.updateSupplier(context, id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @HttpCode(204)
  async deleteSupplier(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    await this.suppliersService.deleteSupplier(context, id);
  }

  @Get(":id/mappings")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async listMappings(
    @AuthContextParam() context: AuthContext,
    @Param("id") supplierId: string,
    @Query("search") search?: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.suppliersService.listMappings(context, supplierId, { search, limit, offset });
  }

  @Post(":id/mappings")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async createMapping(
    @AuthContextParam() context: AuthContext,
    @Param("id") supplierId: string,
    @Body() dto: CreateSupplierProductDto,
  ) {
    return this.suppliersService.createMapping(context, supplierId, dto);
  }

  @Patch(":id/mappings/:mappingId")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async updateMapping(
    @AuthContextParam() context: AuthContext,
    @Param("id") supplierId: string,
    @Param("mappingId") mappingId: string,
    @Body() dto: UpdateSupplierProductDto,
  ) {
    return this.suppliersService.updateMapping(context, supplierId, mappingId, dto);
  }

  @Delete(":id/mappings/:mappingId")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @HttpCode(204)
  async deleteMapping(
    @AuthContextParam() context: AuthContext,
    @Param("id") supplierId: string,
    @Param("mappingId") mappingId: string,
  ) {
    await this.suppliersService.deleteMapping(context, supplierId, mappingId);
  }
}
