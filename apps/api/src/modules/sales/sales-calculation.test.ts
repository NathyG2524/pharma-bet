import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateFefoLots } from "./sales-allocation";
import { computeCogs, computeLineTotals } from "./sales-calculation";

describe("sales calculations", () => {
  it("allocates lots by FEFO and updates stock", () => {
    const lots = [
      {
        id: "lot-a",
        expiryDate: "2025-01-01",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        quantityOnHand: 2,
        unitCost: "5.0000",
      },
      {
        id: "lot-b",
        expiryDate: "2025-01-01",
        createdAt: new Date("2024-02-01T00:00:00Z"),
        quantityOnHand: 3,
        unitCost: "6.0000",
      },
      {
        id: "lot-c",
        expiryDate: "2025-02-01",
        createdAt: new Date("2024-01-15T00:00:00Z"),
        quantityOnHand: 4,
        unitCost: "7.0000",
      },
    ];

    const result = allocateFefoLots(lots, 4);

    assert.deepEqual(result.allocations, [
      { lotId: "lot-a", quantity: 2, unitCost: "5.0000" },
      { lotId: "lot-b", quantity: 2, unitCost: "6.0000" },
    ]);
    assert.equal(lots[0].quantityOnHand, 0);
    assert.equal(lots[1].quantityOnHand, 1);
    assert.equal(lots[2].quantityOnHand, 4);
  });

  it("computes line totals with tax math", () => {
    const totals = computeLineTotals({ quantity: 2, unitPrice: "10.00", taxRate: "0.0750" });
    assert.equal(totals.lineSubtotal, "20.0000");
    assert.equal(totals.taxAmount, "1.5000");
    assert.equal(totals.lineTotal, "21.5000");
  });

  it("computes COGS as the sum of lot costs", () => {
    const cogs = computeCogs([
      { lotId: "lot-a", quantity: 2, unitCost: "5.0000" },
      { lotId: "lot-b", quantity: 1, unitCost: "7.2500" },
    ]);
    assert.equal(cogs, "17.2500");
  });
});
