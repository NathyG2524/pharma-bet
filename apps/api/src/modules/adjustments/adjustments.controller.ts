import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../tenancy/auth-context";
import { AuthContextParam } from "../tenancy/auth.decorators";
import { AuthGuard } from "../tenancy/auth.guard";
import { BranchGuard } from "../tenancy/branch.guard";
import { AdjustmentsService } from "./adjustments.service";
import type { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import type { SubmitAdjustmentForApprovalDto } from "./dto/submit-adjustment.dto";

@Controller("adjustments")
@ApiTags("Adjustments")
@UseGuards(AuthGuard, BranchGuard)
export class AdjustmentsController {
  constructor(
    @Inject(AdjustmentsService)
    private readonly adjustmentsService: AdjustmentsService,
  ) {}

  @Get()
  async list(@AuthContextParam() context: AuthContext) {
    return this.adjustmentsService.listAdjustments(context);
  }

  @Get(":id")
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.adjustmentsService.getAdjustment(context, id);
  }

  @Post()
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreateAdjustmentDto) {
    return this.adjustmentsService.createAdjustment(context, dto);
  }

  @Post(":id/submit")
  async submit(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: SubmitAdjustmentForApprovalDto,
  ) {
    return this.adjustmentsService.submitForApproval(context, id, dto);
  }

  @Post(":id/sync-approval")
  async syncApproval(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.adjustmentsService.syncApprovalStatus(context, id);
  }

  @Post(":id/post")
  async post(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.adjustmentsService.postAdjustment(context, id);
  }
}
