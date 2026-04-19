import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { ReceivePurchaseOrderDto } from "./dto/receive-purchase-order.dto";
import { PurchaseOrdersService } from "./purchase-orders.service";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BRANCH_ROLES = [UserRole.BRANCH_MANAGER, UserRole.BRANCH_USER];

@Controller("purchase-orders")
@ApiTags("Purchase Orders")
@UseGuards(AuthGuard)
export class PurchaseOrdersController {
  constructor(
    @Inject(PurchaseOrdersService)
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Get()
  async list(@AuthContextParam() context: AuthContext) {
    return this.purchaseOrdersService.listPurchaseOrders(context);
  }

  @Get(":id")
  async get(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.purchaseOrdersService.getPurchaseOrder(context, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  @ApiBody({ type: CreatePurchaseOrderDto })
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.createPurchaseOrder(context, dto);
  }

  @Post(":id/approve")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async approve(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.purchaseOrdersService.approvePurchaseOrder(context, id);
  }

  @Post(":id/receive")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  @ApiBody({ type: ReceivePurchaseOrderDto })
  async receive(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.receivePurchaseOrder(context, id, dto);
  }
}
