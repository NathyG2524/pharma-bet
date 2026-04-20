import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InventoryLotStatus } from "../../entities/inventory-lot.entity";
import type { TransferLot, TransferStockLot } from "./transfer-helpers";
import { applyTransferReceiptAdjustments, buildOverrideAllocations } from "./transfer-helpers";

const makeLot = (overrides: Partial<TransferLot>): TransferLot => ({
  id: overrides.id ?? "lot-1",
  lotCode: overrides.lotCode ?? "LOT-001",
  expiryDate: overrides.expiryDate ?? "2030-01-01",
  unitCost: overrides.unitCost ?? "2.5000",
  status: overrides.status ?? InventoryLotStatus.ACTIVE,
  quantityOnHand: overrides.quantityOnHand ?? 10,
  createdAt: overrides.createdAt ?? new Date(),
});

const makeStockLot = (overrides: Partial<TransferStockLot>): TransferStockLot => ({
  id: overrides.id ?? "lot-1",
  medicineId: overrides.medicineId ?? "med-1",
  lotCode: overrides.lotCode ?? "LOT-001",
  expiryDate: overrides.expiryDate ?? "2030-01-01",
  unitCost: overrides.unitCost ?? "2.5000",
  quantityOnHand: overrides.quantityOnHand ?? 10,
});

describe("transfer helpers", () => {
  it("blocks override allocations on quarantined lots", () => {
    const lot = makeLot({ id: "lot-q", status: InventoryLotStatus.QUARANTINE });
    assert.throws(
      () => buildOverrideAllocations(5, [{ lotId: "lot-q", quantity: 5 }], [lot]),
      /Lot status blocks transfer allocation/,
    );
  });

  it("moves quantities from source to destination lots on receipt", () => {
    const source = makeStockLot({ id: "lot-source", quantityOnHand: 12 });
    const destination = makeStockLot({
      id: "lot-dest",
      quantityOnHand: 3,
    });
    const { totalsByMedicine, destinationLots, sourceLots } = applyTransferReceiptAdjustments(
      [source],
      [destination],
      [
        {
          sourceLotId: "lot-source",
          medicineId: "med-1",
          lotCode: "LOT-001",
          expiryDate: "2030-01-01",
          unitCost: "2.5000",
          quantityReceived: 5,
        },
      ],
      (allocation) =>
        makeStockLot({
          id: "created",
          medicineId: allocation.medicineId,
          lotCode: allocation.lotCode,
          expiryDate: allocation.expiryDate,
          unitCost: allocation.unitCost,
          quantityOnHand: 0,
        }),
    );

    assert.equal(sourceLots[0].quantityOnHand, 7);
    assert.equal(destinationLots[0].quantityOnHand, 8);
    assert.equal(totalsByMedicine.get("med-1"), 5);
  });
});
