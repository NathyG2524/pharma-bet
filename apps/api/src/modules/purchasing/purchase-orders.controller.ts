import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { BRANCH_ROLES, HQ_ROLES } from "../tenancy/role-utils";
import { RolesGuard } from "../tenancy/roles.guard";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { ReceivePurchaseOrderDto } from "./dto/receive-purchase-order.dto";
import { PurchaseOrdersService } from "./purchase-orders.service";

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
