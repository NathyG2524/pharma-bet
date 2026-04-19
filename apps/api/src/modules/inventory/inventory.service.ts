import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { InventoryLot } from "../../entities/inventory-lot.entity";
import { Medicine } from "../../entities/medicine.entity";
import type { AuthContext } from "../tenancy/auth-context";
import { isLotExpired } from "./lot-expiry";

type LotSummary = {
  id: string;
  medicineId: string;
  medicineName: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  quantityOnHand: number;
  isExpired: boolean;
};

type ValuationLine = {
  medicineId: string;
  medicineName: string;
  quantityOnHand: number;
  totalValue: string;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryLot)
    private readonly lotRepo: Repository<InventoryLot>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
  ) {}

  private getBranchScope(context: AuthContext) {
    if (!context.tenantId || !context.activeBranchId) {
      throw new NotFoundException("Active branch context required");
    }
    return { tenantId: context.tenantId, branchId: context.activeBranchId };
  }

  async listLots(
    context: AuthContext,
    options: { medicineId?: string },
  ): Promise<{ items: LotSummary[]; total: number }> {
    const scope = this.getBranchScope(context);
    if (options.medicineId) {
      const exists = await this.medicineRepo.exists({
        where: { id: options.medicineId, tenantId: scope.tenantId },
      });
      if (!exists) {
        throw new NotFoundException(`Medicine ${options.medicineId} not found`);
      }
    }
    const qb = this.lotRepo
      .createQueryBuilder("lot")
      .leftJoinAndSelect("lot.medicine", "medicine")
      .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("lot.branchId = :branchId", { branchId: scope.branchId });
    if (options.medicineId) {
      qb.andWhere("lot.medicineId = :medicineId", { medicineId: options.medicineId });
    }
    qb.orderBy("lot.expiryDate", "ASC").addOrderBy("lot.lotCode", "ASC");
    const lots = await qb.getMany();
    const items = lots.map((lot) => ({
      id: lot.id,
      medicineId: lot.medicineId,
      medicineName: lot.medicine?.name ?? "Unknown",
      lotCode: lot.lotCode,
      expiryDate: lot.expiryDate,
      unitCost: lot.unitCost,
      quantityOnHand: lot.quantityOnHand,
      isExpired: isLotExpired(lot.expiryDate),
    }));
    return { items, total: items.length };
  }

  async getBranchValuation(context: AuthContext): Promise<{
    totalValue: string;
    lines: ValuationLine[];
  }> {
    const scope = this.getBranchScope(context);
    const rows = await this.lotRepo
      .createQueryBuilder("lot")
      .innerJoin("lot.medicine", "medicine")
      .select("lot.medicineId", "medicineId")
      .addSelect("medicine.name", "medicineName")
      .addSelect("SUM(lot.quantityOnHand)", "quantityOnHand")
      .addSelect("SUM(lot.quantityOnHand * lot.unitCost)", "totalValue")
      .where("lot.tenantId = :tenantId", { tenantId: scope.tenantId })
      .andWhere("lot.branchId = :branchId", { branchId: scope.branchId })
      .groupBy("lot.medicineId")
      .addGroupBy("medicine.name")
      .orderBy("medicine.name", "ASC")
      .getRawMany();

    const lines: ValuationLine[] = rows.map((row) => ({
      medicineId: row.medicineId,
      medicineName: row.medicineName,
      quantityOnHand: Number(row.quantityOnHand ?? 0),
      totalValue: row.totalValue ?? "0",
    }));

    const totalValue = sumDecimalStrings(lines.map((line) => line.totalValue));
    return { totalValue, lines };
  }
}

const sumDecimalStrings = (values: string[], scale = 4): string => {
  const factor = BigInt(10 ** scale);
  const total = values.reduce((acc, raw) => {
    if (!raw) return acc;
    const [intPart, fracPart = ""] = String(raw).split(".");
    const normalizedFrac = fracPart.padEnd(scale, "0").slice(0, scale);
    const signed = intPart.startsWith("-") ? -1n : 1n;
    const absInt = intPart.replace("-", "") || "0";
    const scaled = BigInt(absInt) * factor + BigInt(normalizedFrac || "0");
    return acc + signed * scaled;
  }, 0n);
  const isNegative = total < 0n;
  const absTotal = isNegative ? -total : total;
  const intPart = absTotal / factor;
  const fracPart = String(absTotal % factor).padStart(scale, "0");
  return `${isNegative ? "-" : ""}${intPart.toString()}.${fracPart}`;
};
