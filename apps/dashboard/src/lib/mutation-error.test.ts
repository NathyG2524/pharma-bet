import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMutationErrorMessage } from "./mutation-error.ts";

describe("getMutationErrorMessage", () => {
  it("returns retry guidance for network failures", () => {
    const message = getMutationErrorMessage(
      new TypeError("Failed to fetch"),
      "Sale was not recorded.",
    );
    assert.equal(
      message,
      "Sale was not recorded. Could not reach the API. Check your connection, confirm the API is running, then retry.",
    );
  });

  it("returns setup guidance for missing api configuration", () => {
    const message = getMutationErrorMessage(
      new Error("Sales API not configured (apiBaseUrl required)"),
      "Sale was not recorded.",
    );
    assert.equal(
      message,
      "Sale was not recorded. API endpoint is not configured. Set NEXT_PUBLIC_API_URL and retry.",
    );
  });

  it("keeps server-side error details for non-network errors", () => {
    const message = getMutationErrorMessage(
      new Error('API error: 422 {"message":"Validation failed"}'),
      "Sale was not recorded.",
    );
    assert.equal(
      message,
      'Sale was not recorded. API error: 422 {"message":"Validation failed"} Retry once the issue is resolved.',
    );
  });
});
