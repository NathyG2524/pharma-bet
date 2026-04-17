import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { CreatePatientHistoryDto } from "../dto/patient-history.dto";
import type { CreatePatientDto } from "../dto/patient.dto";
import { PatientsService } from "../services/patients.service";

@Controller("patients")
@ApiTags("Patients")
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get("by-phone/:phone")
  async findByPhone(@Param("phone") phone: string) {
    return this.patientsService.findByPhone(phone);
  }

  @Post()
  async create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.patientsService.findOne(id);
  }

  @Get(":id/history")
  async getHistory(@Param("id") id: string) {
    return this.patientsService.getHistory(id);
  }

  @Post(":id/history")
  async addHistory(@Param("id") id: string, @Body() dto: CreatePatientHistoryDto) {
    return this.patientsService.addHistory(id, dto);
  }
}
