import { createHash } from "node:crypto";

/** Deterministic hash for invite token lookup; raw tokens must never be stored. */
export function hashInviteToken(plainToken: string): string {
  return createHash("sha256").update(plainToken.trim(), "utf8").digest("hex");
}
