import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeLineTax } from "./tax-calculation";

describe("computeLineTax", () => {
  it("calculates base, rate, and amount with a fixed rate", () => {
    const result = computeLineTax({ quantity: 2, unitPrice: "10.00", taxRate: "0.0750" });
    assert.deepEqual(result, {
      taxBase: "20.0000",
      taxRate: "0.0750",
      taxAmount: "1.5000",
    });
  });
});
