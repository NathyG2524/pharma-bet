import { InventoryLotStatus } from "../../entities/inventory-lot.entity";

export const BLOCKED_LOT_STATUSES = new Set<InventoryLotStatus>([
  InventoryLotStatus.QUARANTINE,
  InventoryLotStatus.RECALLED,
]);

export const isLotBlockedForAllocation = (status: InventoryLotStatus): boolean =>
  BLOCKED_LOT_STATUSES.has(status);

export const canTransitionLotStatus = (
  current: InventoryLotStatus,
  next: InventoryLotStatus,
): boolean => {
  if (current === InventoryLotStatus.RECALLED && next !== InventoryLotStatus.RECALLED) {
    return false;
  }
  return true;
};
