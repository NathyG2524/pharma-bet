export type FefoLot = {
  id: string;
  expiryDate: string;
  createdAt: Date;
  quantityOnHand: number;
  unitCost: string;
};

export type LotAllocation = {
  lotId: string;
  quantity: number;
  unitCost: string;
};

export function allocateFefoLots<T extends FefoLot>(
  lots: T[],
  quantity: number,
): { allocations: LotAllocation[]; updatedLots: T[] } {
  const allocations: LotAllocation[] = [];
  let remaining = quantity;
  const ordered = [...lots].sort((a, b) => {
    const expiryDiff = a.expiryDate.localeCompare(b.expiryDate);
    if (expiryDiff !== 0) return expiryDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  for (const lot of ordered) {
    if (remaining <= 0) break;
    if (lot.quantityOnHand <= 0) continue;
    const take = Math.min(remaining, lot.quantityOnHand);
    allocations.push({ lotId: lot.id, quantity: take, unitCost: lot.unitCost });
    lot.quantityOnHand -= take;
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error("Not enough stock for FEFO allocation");
  }

  return { allocations, updatedLots: ordered };
}
