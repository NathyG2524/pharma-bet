import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import { BranchesService } from "./branches.service";
import type { AssignMembershipDto } from "./dto/assign-membership.dto";
import type { CreateBranchDto } from "./dto/create-branch.dto";

@Controller()
@ApiTags("Branches")
@UseGuards(AuthGuard, RolesGuard)
export class BranchesController {
  constructor(
    @Inject(BranchesService)
    private readonly branchesService: BranchesService,
  ) {}

  @Get("branches")
  async list(@AuthContextParam() context: AuthContext) {
    return this.branchesService.listForUser(context);
  }

  @Post("branches")
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER)
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateBranchDto) {
    return this.branchesService.createBranch(context, dto);
  }

  @Post("memberships")
  @Roles(UserRole.HQ_ADMIN, UserRole.HQ_USER)
  async assignMembership(
    @AuthContextParam() context: AuthContext,
    @Body() dto: AssignMembershipDto,
  ) {
    return this.branchesService.assignMembership(context, dto);
  }
}
