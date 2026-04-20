const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { InventoryLotStatus } = require("../../entities/inventory-lot.entity");
const { canTransitionLotStatus, isLotBlockedForAllocation } = require("./lot-status");

describe("lot status rules", () => {
  it("blocks allocation for quarantined and recalled lots", () => {
    assert.equal(isLotBlockedForAllocation(InventoryLotStatus.ACTIVE), false);
    assert.equal(isLotBlockedForAllocation(InventoryLotStatus.QUARANTINE), true);
    assert.equal(isLotBlockedForAllocation(InventoryLotStatus.RECALLED), true);
  });

  it("disallows reactivating recalled lots", () => {
    assert.equal(
      canTransitionLotStatus(InventoryLotStatus.RECALLED, InventoryLotStatus.ACTIVE),
      false,
    );
    assert.equal(
      canTransitionLotStatus(InventoryLotStatus.RECALLED, InventoryLotStatus.QUARANTINE),
      false,
    );
    assert.equal(
      canTransitionLotStatus(InventoryLotStatus.RECALLED, InventoryLotStatus.RECALLED),
      true,
    );
    assert.equal(
      canTransitionLotStatus(InventoryLotStatus.ACTIVE, InventoryLotStatus.RECALLED),
      true,
    );
  });
});
