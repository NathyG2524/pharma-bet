import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { PatientHistory } from "../../../entities/patient-history.entity";
import { Patient } from "../../../entities/patient.entity";
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

  async findByPhone(phone: string): Promise<PatientWithHistory> {
    const normalized = phone.replace(/\D/g, "");
    const patient = await this.patientRepo.findOne({
      where: { phone: normalized },
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

  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient ${id} not found`);
    }
    return patient;
  }

  async create(dto: CreatePatientDto): Promise<Patient> {
    const phone = dto.phone.replace(/\D/g, "");
    const existing = await this.patientRepo.exists({ where: { phone } });
    if (existing) {
      throw new ConflictException("Patient with this phone already exists");
    }
    const patient = this.patientRepo.create({
      phone,
      name: dto.name ?? null,
    });
    return this.patientRepo.save(patient);
  }

  async getHistory(patientId: string): Promise<PatientHistory[]> {
    await this.findOne(patientId);
    return this.historyRepo.find({
      where: { patientId },
      order: { recordedAt: "DESC" },
    });
  }

  async addHistory(patientId: string, dto: CreatePatientHistoryDto): Promise<PatientHistory> {
    await this.findOne(patientId);
    const record = this.historyRepo.create({
      patientId,
      recordedAt: new Date(dto.recordedAt),
      bloodPressureSystolic: dto.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: dto.bloodPressureDiastolic ?? null,
      notes: dto.notes ?? null,
    });
    return this.historyRepo.save(record);
  }
}
