import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { computeDaysUntilDate, normalizeReportDateWindow } from "./inventory.service";

describe("inventory report date window helpers", () => {
  it("rejects windows larger than 365 days", () => {
    assert.throws(
      () =>
        normalizeReportDateWindow({
          startDate: "2026-01-01",
          endDate: "2027-01-02",
        }),
      BadRequestException,
    );
  });

  it("applies default expiry horizon when no dates are provided", () => {
    const window = normalizeReportDateWindow({}, { defaultStartToToday: true, defaultEndDays: 90 });
    assert.ok(window.startDateOnly);
    assert.ok(window.endDateOnly);
  });

  it("computes day deltas from today for expiry dates", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    assert.equal(computeDaysUntilDate(todayIso), 0);
  });
});
