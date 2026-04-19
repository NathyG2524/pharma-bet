import { QueryFailedError, type Repository } from "typeorm";
import type { InventoryLot } from "../../entities/inventory-lot.entity";
import type { MedicineOverlay } from "../../entities/medicine-overlay.entity";

export const saveOverlayWithRetry = async (
  repo: Repository<MedicineOverlay>,
  entity: MedicineOverlay,
  delta: number,
  lookup: { tenantId: string; branchId: string; medicineId: string },
): Promise<MedicineOverlay> => {
  try {
    return await repo.save(entity);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await repo.findOne({
        where: lookup,
        lock: { mode: "pessimistic_write" },
      });
      if (!existing) throw error;
      existing.stockQuantity += delta;
      return repo.save(existing);
    }
    throw error;
  }
};

export const saveLotWithRetry = async (
  repo: Repository<InventoryLot>,
  entity: InventoryLot,
  delta: number,
  lookup: {
    tenantId: string;
    branchId: string;
    medicineId: string;
    lotCode: string;
    expiryDate: string;
    unitCost: string;
  },
): Promise<InventoryLot> => {
  try {
    return await repo.save(entity);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await repo.findOne({
        where: lookup,
        lock: { mode: "pessimistic_write" },
      });
      if (!existing) throw error;
      existing.quantityOnHand += delta;
      return repo.save(existing);
    }
    throw error;
  }
};

const isUniqueViolation = (error: unknown) =>
  error instanceof QueryFailedError && (error as { code?: string }).code === "23505";
