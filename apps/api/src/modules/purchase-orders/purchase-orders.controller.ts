import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { PurchaseOrderStatus } from "../../entities/purchase-order.entity";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import type {
  CreatePurchaseOrderDto,
  PurchaseOrderDecisionDto,
  UpdatePurchaseOrderDto,
} from "./dto/purchase-order.dto";
import { PurchaseOrdersService } from "./purchase-orders.service";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BRANCH_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];

@Controller()
@ApiTags("PurchaseOrders")
@UseGuards(AuthGuard)
export class PurchaseOrdersController {
  constructor(
    @Inject(PurchaseOrdersService)
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  private parseStatus(status?: string): PurchaseOrderStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (!Object.values(PurchaseOrderStatus).includes(status as PurchaseOrderStatus)) {
      throw new BadRequestException("Invalid purchase order status filter");
    }
    return status as PurchaseOrderStatus;
  }

  @Get("purchase-orders")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @ApiQuery({ name: "status", required: false })
  async list(@AuthContextParam() context: AuthContext, @Query("status") status?: string) {
    return this.purchaseOrdersService.list(context, this.parseStatus(status));
  }

  @Post("purchase-orders")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(context, dto);
  }

  @Patch("purchase-orders/:id")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async update(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(context, id, dto);
  }

  @Post("purchase-orders/:id/submit")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async submit(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.purchaseOrdersService.submit(context, id);
  }

  @Get("purchase-orders/inbox")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  @ApiQuery({ name: "status", required: false })
  async inbox(@AuthContextParam() context: AuthContext, @Query("status") status?: string) {
    return this.purchaseOrdersService.listInbox(context, this.parseStatus(status));
  }

  @Get("purchase-orders/:id")
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.purchaseOrdersService.findOne(context, id);
  }

  @Get("purchase-orders/:id/events")
  async events(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.purchaseOrdersService.listEvents(context, id);
  }

  @Post("purchase-orders/:id/approve")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async approve(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.purchaseOrdersService.approve(context, id);
  }

  @Post("purchase-orders/:id/reject")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async reject(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: PurchaseOrderDecisionDto,
  ) {
    return this.purchaseOrdersService.reject(context, id, dto);
  }

  @Post("purchase-orders/:id/request-changes")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async requestChanges(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: PurchaseOrderDecisionDto,
  ) {
    return this.purchaseOrdersService.requestChanges(context, id, dto);
  }
}
