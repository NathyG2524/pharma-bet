import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { PatientHistory } from "../../../entities/patient-history.entity";
import { Patient } from "../../../entities/patient.entity";
import type { AuthContext } from "../../tenancy/auth-context";
import type { CreatePatientHistoryDto } from "../dto/patient-history.dto";
import type { CreatePatientDto } from "../dto/patient.dto";

export interface PatientWithHistory {
  id: string;
  phone: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  history: PatientHistory[];
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(PatientHistory)
    private readonly historyRepo: Repository<PatientHistory>,
  ) {}

  private getBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { tenantId: context.tenantId, branchId: context.activeBranchId };
  }

  async findByPhone(context: AuthContext, phone: string): Promise<PatientWithHistory> {
    const normalized = phone.replace(/\D/g, "");
    const scope = this.getBranchScope(context);
    const patient = await this.patientRepo.findOne({
      where: { phone: normalized, tenantId: scope.tenantId, branchId: scope.branchId },
      relations: { history: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with phone ${phone} not found`);
    }
    const history = (patient.history ?? []).sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
    return {
      id: patient.id,
      phone: patient.phone,
      name: patient.name,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      history,
    };
  }

  async findOne(context: AuthContext, id: string): Promise<Patient> {
    const scope = this.getBranchScope(context);
    const patient = await this.patientRepo.findOne({
      where: { id, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${id} not found`);
    }
    return patient;
  }

  async create(context: AuthContext, dto: CreatePatientDto): Promise<Patient> {
    const phone = dto.phone.replace(/\D/g, "");
    const scope = this.getBranchScope(context);
    const existing = await this.patientRepo.exists({
      where: { phone, tenantId: scope.tenantId, branchId: scope.branchId },
    });
    if (existing) {
      throw new ConflictException("Patient with this phone already exists");
    }
    const patient = this.patientRepo.create({
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      phone,
      name: dto.name ?? null,
    });
    return this.patientRepo.save(patient);
  }

  async getHistory(context: AuthContext, patientId: string): Promise<PatientHistory[]> {
    const scope = this.getBranchScope(context);
    await this.findOne(context, patientId);
    return this.historyRepo.find({
      where: { patientId, tenantId: scope.tenantId, branchId: scope.branchId },
      order: { recordedAt: "DESC" },
    });
  }

  async addHistory(
    context: AuthContext,
    patientId: string,
    dto: CreatePatientHistoryDto,
  ): Promise<PatientHistory> {
    const scope = this.getBranchScope(context);
    await this.findOne(context, patientId);
    const record = this.historyRepo.create({
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      patientId,
      recordedAt: new Date(dto.recordedAt),
      bloodPressureSystolic: dto.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: dto.bloodPressureDiastolic ?? null,
      notes: dto.notes ?? null,
    });
    return this.historyRepo.save(record);
  }
}
