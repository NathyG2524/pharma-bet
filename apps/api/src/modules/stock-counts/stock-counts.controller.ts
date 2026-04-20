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
import type { CreateStockCountSessionDto } from "./dto/create-session.dto";
import type { RecordVarianceDto } from "./dto/record-variance.dto";
import type { SubmitSessionDto } from "./dto/submit-session.dto";
import { StockCountsService } from "./stock-counts.service";

@Controller("stock-counts")
@ApiTags("StockCounts")
@UseGuards(AuthGuard, BranchGuard)
export class StockCountsController {
  constructor(
    @Inject(StockCountsService)
    private readonly stockCountsService: StockCountsService,
  ) {}

  @Get()
  async list(@AuthContextParam() context: AuthContext) {
    return this.stockCountsService.listSessions(context);
  }

  @Get(":id")
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.stockCountsService.getSession(context, id);
  }

  @Post()
  async create(
    @AuthContextParam() context: AuthContext,
    @Body() dto: CreateStockCountSessionDto,
  ) {
    return this.stockCountsService.createSession(context, dto);
  }

  @Post(":id/variances")
  async recordVariance(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: RecordVarianceDto,
  ) {
    return this.stockCountsService.recordVariance(context, id, dto);
  }

  @Post(":id/submit")
  async submit(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: SubmitSessionDto,
  ) {
    return this.stockCountsService.submitSession(context, id, dto);
  }

  @Post(":id/sync-approval")
  async syncApproval(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.stockCountsService.syncApprovalStatus(context, id);
  }

  @Post(":id/post")
  async post(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.stockCountsService.postSession(context, id);
  }
}
