import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../../tenancy/auth-context";
import { AuthContextParam } from "../../tenancy/auth.decorators";
import { AuthGuard } from "../../tenancy/auth.guard";
import { BranchGuard } from "../../tenancy/branch.guard";
import type { CreatePatientHistoryDto } from "../dto/patient-history.dto";
import type { CreatePatientDto } from "../dto/patient.dto";
import { PatientsService } from "../services/patients.service";

@Controller("patients")
@ApiTags("Patients")
@UseGuards(AuthGuard, BranchGuard)
export class PatientsController {
  constructor(
    @Inject(PatientsService)
    private readonly patientsService: PatientsService,
  ) {}

  @Get("by-phone/:phone")
  async findByPhone(@AuthContextParam() context: AuthContext, @Param("phone") phone: string) {
    return this.patientsService.findByPhone(context, phone);
  }

  @Post()
  async create(@AuthContextParam() context: AuthContext, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(context, dto);
  }

  @Get(":id")
  async findOne(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.patientsService.findOne(context, id);
  }

  @Get(":id/history")
  async getHistory(@AuthContextParam() context: AuthContext, @Param("id") id: string) {
    return this.patientsService.getHistory(context, id);
  }

  @Post(":id/history")
  async addHistory(
    @AuthContextParam() context: AuthContext,
    @Param("id") id: string,
    @Body() dto: CreatePatientHistoryDto,
  ) {
    return this.patientsService.addHistory(context, id, dto);
  }
}
