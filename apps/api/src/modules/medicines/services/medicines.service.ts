import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Medicine } from '../../../entities/medicine.entity';
import {
  MedicineTransaction,
  MedicineTransactionType,
} from '../../../entities/medicine-transaction.entity';
import { Patient } from '../../../entities/patient.entity';
import type { BuyMedicineDto } from '../dto/medicine-transaction.dto';
import type { SellMedicineDto } from '../dto/medicine-transaction.dto';
import type { CreateMedicineDto, UpdateMedicineDto } from '../dto/medicine.dto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class MedicinesService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(MedicineTransaction)
    private readonly txRepo: Repository<MedicineTransaction>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly dataSource: DataSource,
  ) {}

  async list(options: {
    search?: string;
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  }): Promise<{ items: Medicine[]; total: number }> {
    const limit = Math.min(
      Math.max(1, options.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = Math.max(0, options.offset ?? 0);
    const qb = this.medicineRepo.createQueryBuilder('m');
    if (!options.includeInactive) {
      qb.andWhere('m.isActive = :active', { active: true });
    }
    if (options.search?.trim()) {
      qb.andWhere('m.name ILIKE :search', {
        search: `%${options.search.trim()}%`,
      });
    }
    qb.orderBy('m.name', 'ASC').skip(offset).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOne(id: string): Promise<Medicine> {
    const medicine = await this.medicineRepo.findOne({ where: { id } });
    if (!medicine) {
      throw new NotFoundException(`Medicine ${id} not found`);
    }
    return medicine;
  }

  async create(dto: CreateMedicineDto): Promise<Medicine> {
    const name = dto.name.trim();
    const exists = await this.medicineRepo.exists({ where: { name } });
    if (exists) {
      throw new ConflictException('A medicine with this name already exists');
    }
    const medicine = this.medicineRepo.create({
      name,
      sku: dto.sku?.trim() || null,
      unit: dto.unit?.trim() || null,
      stockQuantity: 0,
      isActive: true,
    });
    return this.medicineRepo.save(medicine);
  }

  async update(id: string, dto: UpdateMedicineDto): Promise<Medicine> {
    const medicine = await this.findOne(id);
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const other = await this.medicineRepo.findOne({ where: { name } });
      if (other && other.id !== id) {
        throw new ConflictException('A medicine with this name already exists');
      }
      medicine.name = name;
    }
    if (dto.sku !== undefined) {
      medicine.sku = dto.sku?.trim() || null;
    }
    if (dto.unit !== undefined) {
      medicine.unit = dto.unit?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      medicine.isActive = dto.isActive;
    }
    return this.medicineRepo.save(medicine);
  }

  async buy(medicineId: string, dto: BuyMedicineDto): Promise<MedicineTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const medRepo = manager.getRepository(Medicine);
      const transactionRepo = manager.getRepository(MedicineTransaction);
      const medicine = await medRepo.findOne({
        where: { id: medicineId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!medicine) {
        throw new NotFoundException(`Medicine ${medicineId} not found`);
      }
      medicine.stockQuantity += dto.quantity;
      await medRepo.save(medicine);
      const row = transactionRepo.create({
        medicineId,
        type: MedicineTransactionType.BUY,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice?.trim() || null,
        recordedAt: new Date(dto.recordedAt),
        patientId: null,
        notes: dto.notes?.trim() || null,
      });
      return transactionRepo.save(row);
    });
  }

  async sell(
    medicineId: string,
    dto: SellMedicineDto,
  ): Promise<MedicineTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const medRepo = manager.getRepository(Medicine);
      const transactionRepo = manager.getRepository(MedicineTransaction);
      const patRepo = manager.getRepository(Patient);
      const medicine = await medRepo.findOne({
        where: { id: medicineId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!medicine) {
        throw new NotFoundException(`Medicine ${medicineId} not found`);
      }
      let patientId: string | null = null;
      if (dto.patientId) {
        const ok = await patRepo.exists({ where: { id: dto.patientId } });
        if (!ok) {
          throw new NotFoundException(`Patient ${dto.patientId} not found`);
        }
        patientId = dto.patientId;
      }
      if (medicine.stockQuantity < dto.quantity) {
        throw new ConflictException('Not enough stock');
      }
      medicine.stockQuantity -= dto.quantity;
      await medRepo.save(medicine);
      const row = transactionRepo.create({
        medicineId,
        type: MedicineTransactionType.SELL,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice?.trim() || null,
        recordedAt: new Date(dto.recordedAt),
        patientId,
        notes: dto.notes?.trim() || null,
      });
      return transactionRepo.save(row);
    });
  }

  async getTransactions(
    medicineId: string,
    options: { limit?: number; offset?: number },
  ): Promise<{ items: MedicineTransaction[]; total: number }> {
    await this.findOne(medicineId);
    const limit = Math.min(
      Math.max(1, options.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = Math.max(0, options.offset ?? 0);
    const [items, total] = await this.txRepo.findAndCount({
      where: { medicineId },
      relations: { patient: true },
      order: { recordedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }
}
