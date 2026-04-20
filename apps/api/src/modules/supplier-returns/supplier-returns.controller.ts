import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import type { CreateSupplierReturnDto } from "./dto/create-supplier-return.dto";
import type { HqConfirmSupplierReturnDto } from "./dto/hq-confirm-supplier-return.dto";
import type { SubmitSupplierReturnForApprovalDto } from "./dto/submit-supplier-return.dto";
import { SupplierReturnsService } from "./supplier-returns.service";

const HQ_ROLES = [UserRole.HQ_ADMIN, UserRole.HQ_USER, UserRole.PLATFORM_ADMIN];
const BRANCH_ROLES = [
  UserRole.BRANCH_MANAGER,
  UserRole.BRANCH_USER,
  UserRole.HQ_ADMIN,
  UserRole.HQ_USER,
  UserRole.PLATFORM_ADMIN,
];

@Controller("supplier-returns")
@ApiTags("SupplierReturns")
@UseGuards(AuthGuard)
export class SupplierReturnsController {
  constructor(
    @Inject(SupplierReturnsService)
    private readonly supplierReturnsService: SupplierReturnsService,
  ) {}

  @Get()
  @UseGuards(BranchGuard)
  async list(@AuthContextParam() context: AuthContext) {
    return this.supplierReturnsService.list(context);
  }

  @Get(":id")
  @UseGuards(BranchGuard)
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.supplierReturnsService.getById(context, id);
  }

  @Post()
  @UseGuards(BranchGuard)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateSupplierReturnDto) {
    return this.supplierReturnsService.create(context, dto);
  }

  @Post(":id/submit")
  @UseGuards(BranchGuard)
  async submit(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.supplierReturnsService.submitForHqConfirmation(context, id);
  }

  @Post(":id/hq-confirm")
  @UseGuards(RolesGuard)
  @Roles(...HQ_ROLES)
  async hqConfirm(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: HqConfirmSupplierReturnDto,
  ) {
    return this.supplierReturnsService.hqConfirm(context, id, dto);
  }

  @Post(":id/submit-approval")
  @UseGuards(BranchGuard)
  async submitApproval(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: SubmitSupplierReturnForApprovalDto,
  ) {
    return this.supplierReturnsService.submitForApproval(context, id, dto);
  }

  @Post(":id/sync-approval")
  @UseGuards(BranchGuard)
  async syncApproval(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.supplierReturnsService.syncApprovalStatus(context, id);
  }

  @Post(":id/dispatch")
  @UseGuards(BranchGuard, RolesGuard)
  @Roles(...BRANCH_ROLES)
  async dispatch(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.supplierReturnsService.dispatch(context, id);
  }
}
