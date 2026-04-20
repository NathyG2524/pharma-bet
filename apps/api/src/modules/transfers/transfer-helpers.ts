import type { InventoryLotStatus } from "../../entities/inventory-lot.entity";
import { isLotBlockedForAllocation } from "../inventory/lot-status";
import { allocateFefoLots } from "../sales/sales-allocation";

export type TransferLot = {
  id: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  status: InventoryLotStatus;
  quantityOnHand: number;
  createdAt: Date;
};

export type TransferAllocationInput = {
  lotId: string;
  quantity: number;
};

export type TransferAllocationResult = {
  lotId: string;
  quantity: number;
  unitCost: string;
  lotCode: string;
  expiryDate: string;
};

export const buildOverrideAllocations = (
  lineQuantity: number,
  allocations: TransferAllocationInput[],
  lots: TransferLot[],
): TransferAllocationResult[] => {
  const quantitiesByLot = new Map<string, number>();
  for (const allocation of allocations) {
    const next = (quantitiesByLot.get(allocation.lotId) ?? 0) + allocation.quantity;
    quantitiesByLot.set(allocation.lotId, next);
  }
  let total = 0;
  const results: TransferAllocationResult[] = [];
  for (const lot of lots) {
    const requested = quantitiesByLot.get(lot.id) ?? 0;
    if (!requested) continue;
    if (isLotBlockedForAllocation(lot.status)) {
      throw new Error("Lot status blocks transfer allocation");
    }
    if (requested > lot.quantityOnHand) {
      throw new Error("Not enough stock in selected lot");
    }
    total += requested;
    results.push({
      lotId: lot.id,
      quantity: requested,
      unitCost: lot.unitCost,
      lotCode: lot.lotCode,
      expiryDate: lot.expiryDate,
    });
  }
  if (total !== lineQuantity) {
    throw new Error("Override allocations must match transfer line quantity");
  }
  return results;
};

export const buildFefoAllocations = (
  lineQuantity: number,
  lots: TransferLot[],
): TransferAllocationResult[] => {
  const eligible = lots.filter(
    (lot) => lot.quantityOnHand > 0 && !isLotBlockedForAllocation(lot.status),
  );
  const { allocations } = allocateFefoLots(eligible, lineQuantity);
  return allocations.map((allocation) => {
    const lot = lots.find((candidate) => candidate.id === allocation.lotId);
    if (!lot) {
      throw new Error("Allocated lot not found");
    }
    return {
      lotId: allocation.lotId,
      quantity: allocation.quantity,
      unitCost: allocation.unitCost,
      lotCode: lot.lotCode,
      expiryDate: lot.expiryDate,
    };
  });
};

export type TransferReceiptAllocation = {
  sourceLotId: string;
  medicineId: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  quantityReceived: number;
};

export type TransferStockLot = {
  id: string;
  medicineId: string;
  lotCode: string;
  expiryDate: string;
  unitCost: string;
  quantityOnHand: number;
};

export const applyTransferReceiptAdjustments = <T extends TransferStockLot>(
  sourceLots: T[],
  destinationLots: T[],
  allocations: TransferReceiptAllocation[],
  createDestinationLot: (allocation: TransferReceiptAllocation) => T,
): {
  totalsByMedicine: Map<string, number>;
  destinationLots: T[];
  sourceLots: T[];
} => {
  const sourceById = new Map(sourceLots.map((lot) => [lot.id, lot]));
  const destinationByKey = new Map(
    destinationLots.map((lot) => [
      `${lot.medicineId}:${lot.lotCode}:${lot.expiryDate}:${lot.unitCost}`,
      lot,
    ]),
  );
  const totalsByMedicine = new Map<string, number>();

  for (const allocation of allocations) {
    const source = sourceById.get(allocation.sourceLotId);
    if (!source) {
      throw new Error(`Source lot ${allocation.sourceLotId} not found`);
    }
    if (allocation.quantityReceived > source.quantityOnHand) {
      throw new Error("Not enough stock to confirm receipt");
    }
    source.quantityOnHand -= allocation.quantityReceived;

    totalsByMedicine.set(
      allocation.medicineId,
      (totalsByMedicine.get(allocation.medicineId) ?? 0) + allocation.quantityReceived,
    );

    const key = `${allocation.medicineId}:${allocation.lotCode}:${allocation.expiryDate}:${allocation.unitCost}`;
    let destination = destinationByKey.get(key);
    if (!destination) {
      destination = createDestinationLot(allocation);
      destinationLots.push(destination);
      destinationByKey.set(key, destination);
    }
    destination.quantityOnHand += allocation.quantityReceived;
  }

  return { totalsByMedicine, destinationLots, sourceLots };
};
