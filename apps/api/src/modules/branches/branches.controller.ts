import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import { BranchesService } from "./branches.service";
import type { AssignMembershipDto } from "./dto/assign-membership.dto";
// biome-ignore lint/style/useImportType: DTO class required for ValidationPipe
import { CreateBranchInviteDto } from "./dto/create-branch-invite.dto";
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

  @Get("branches/invites")
  @Roles(UserRole.HQ_ADMIN)
  async listBranchInvites(@AuthContextParam() context: AuthContext) {
    return this.branchesService.listPendingBranchInvites(context);
  }

  @Post("branches/invites")
  @Roles(UserRole.HQ_ADMIN)
  async createBranchInvite(
    @AuthContextParam() context: AuthContext,
    @Body() dto: CreateBranchInviteDto,
  ) {
    return this.branchesService.createBranchInvite(context, dto);
  }

  @Post("branches/invites/:inviteId/revoke")
  @Roles(UserRole.HQ_ADMIN)
  async revokeBranchInvite(
    @AuthContextParam() context: AuthContext,
    @Param("inviteId") inviteId: string,
  ) {
    return this.branchesService.revokeBranchInvite(context, inviteId);
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
