import {
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
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../entities/user-membership.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam, Roles } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { RolesGuard } from "../tenancy/roles.guard";
import { ApprovalsService } from "./approvals.service";
import type { RecordApprovalDecisionDto } from "./dto/record-approval-decision.dto";
import type { SubmitApprovalDto } from "./dto/submit-approval.dto";
import type { UpdateApprovalPolicyDto } from "./dto/update-approval-policy.dto";

@Controller()
@ApiTags("Approvals")
@UseGuards(AuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(
    @Inject(ApprovalsService)
    private readonly approvalsService: ApprovalsService,
  ) {}

  @Get("approvals")
  async list(
    @AuthContextParam() context: AuthContext,
    @Query("domainType") domainType?: string,
    @Query("domainId") domainId?: string,
  ) {
    return this.approvalsService.list(context, domainType, domainId);
  }

  @Post("approvals/request")
  async submit(@AuthContextParam() context: AuthContext, @Body() dto: SubmitApprovalDto) {
    return this.approvalsService.submitApproval(context, dto);
  }

  @Post("approvals/:id/decisions")
  async decide(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: RecordApprovalDecisionDto,
  ) {
    return this.approvalsService.recordDecision(context, id, dto);
  }

  @Get("approvals/policy")
  async getPolicy(@AuthContextParam() context: AuthContext) {
    return this.approvalsService.getTenantPolicy(context);
  }

  @Patch("approvals/policy")
  @Roles(UserRole.HQ_ADMIN, UserRole.PLATFORM_ADMIN)
  async updatePolicy(
    @AuthContextParam() context: AuthContext,
    @Body() dto: UpdateApprovalPolicyDto,
  ) {
    return this.approvalsService.updateTenantPolicy(context, dto);
  }

  @Get("approvals/:id")
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.approvalsService.findOne(context, id);
  }
}
