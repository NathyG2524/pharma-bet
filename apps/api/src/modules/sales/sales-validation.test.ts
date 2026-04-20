import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requiresPatientForSale } from "./sales-validation.ts";

describe("sales validation", () => {
  it("requires a patient when any medicine is flagged", () => {
    assert.equal(
      requiresPatientForSale([{ requiresPatient: false }, { requiresPatient: true }]),
      true,
    );
  });

  it("does not require a patient when no medicines are flagged", () => {
    assert.equal(
      requiresPatientForSale([{ requiresPatient: false }, { requiresPatient: false }]),
      false,
    );
  });
});
