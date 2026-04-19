import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PatientHistory } from "../../entities/patient-history.entity";
import { Patient } from "../../entities/patient.entity";
import { AuditModule } from "../audit/audit.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { PatientsController } from "./controllers/patients.controller";
import { PatientsService } from "./services/patients.service";

@Module({
  imports: [TypeOrmModule.forFeature([Patient, PatientHistory]), AuditModule, TenancyModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
