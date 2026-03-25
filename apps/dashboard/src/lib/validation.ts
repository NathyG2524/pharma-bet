export function normalizePhone(value: string) {
  return value.trim();
}

export function isValidPhone(value: string) {
  const normalized = normalizePhone(value);
  if (normalized.length < 8) return false;
  return /^[+\d][\d\s-]*$/.test(normalized);
}

export function parseLocalDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}
