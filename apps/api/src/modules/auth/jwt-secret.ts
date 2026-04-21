/** Same default as AuthModule — set JWT_SECRET in production. */
export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "dev-insecure-change-me";
}
