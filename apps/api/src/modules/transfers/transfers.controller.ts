import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { BRANCH_ROLES, HQ_ROLES } from "../tenancy/role-utils";
import { RolesGuard } from "../tenancy/roles.guard";
import type { CreateTransferDto, ReceiveTransferDto, ShipTransferDto } from "./dto/transfer.dto";
import { TransfersService } from "./transfers.service";

const TRANSFER_ROLES = [...BRANCH_ROLES, ...HQ_ROLES];

@Controller("transfers")
@ApiTags("Transfers")
@UseGuards(AuthGuard, BranchGuard)
export class TransfersController {
  constructor(
    @Inject(TransfersService)
    private readonly transfersService: TransfersService,
  ) {}

  @Get()
  async list(@AuthContextParam() context: AuthContext) {
    return this.transfersService.list(context);
  }

  @Get(":id")
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.transfersService.findOne(context, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...TRANSFER_ROLES)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateTransferDto) {
    return this.transfersService.create(context, dto);
  }

  @Post(":id/ship")
  @UseGuards(RolesGuard)
  @Roles(...TRANSFER_ROLES)
  async ship(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: ShipTransferDto,
  ) {
    return this.transfersService.ship(context, id, dto);
  }

  @Post(":id/receive")
  @UseGuards(RolesGuard)
  @Roles(...TRANSFER_ROLES)
  async receive(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: ReceiveTransferDto,
  ) {
    return this.transfersService.receive(context, id, dto);
  }
}
