import { BadRequestException } from "@nestjs/common";

export function normalizeTaxRate(rate: string): string {
  const parsed = Number.parseFloat(rate);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException("Tax rate must be a valid number");
  }
  if (parsed < 0 || parsed > 1) {
    throw new BadRequestException("Tax rate must be between 0 and 1");
  }
  return parsed.toFixed(4);
}
