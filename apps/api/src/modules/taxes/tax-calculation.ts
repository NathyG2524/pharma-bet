export type LineTaxBreakdown = {
  taxBase: string | null;
  taxRate: string | null;
  taxAmount: string | null;
};

const DEFAULT_SCALE = 4;

function parseDecimal(value?: string | null): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function roundToScale(value: number, scale = DEFAULT_SCALE): number {
  const factor = 10 ** scale;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatDecimal(value: number, scale = DEFAULT_SCALE): string {
  return roundToScale(value, scale).toFixed(scale);
}

export function computeLineTax(params: {
  quantity: number;
  unitPrice: string | null;
  taxRate: string | null;
}): LineTaxBreakdown {
  const unitValue = parseDecimal(params.unitPrice);
  const rateValue = parseDecimal(params.taxRate);
  const taxBaseValue =
    unitValue == null ? null : roundToScale(unitValue * params.quantity, DEFAULT_SCALE);
  const taxAmountValue =
    taxBaseValue == null || rateValue == null
      ? null
      : roundToScale(taxBaseValue * rateValue, DEFAULT_SCALE);
  return {
    taxBase: taxBaseValue == null ? null : formatDecimal(taxBaseValue, DEFAULT_SCALE),
    taxRate: rateValue == null ? null : formatDecimal(rateValue, DEFAULT_SCALE),
    taxAmount: taxAmountValue == null ? null : formatDecimal(taxAmountValue, DEFAULT_SCALE),
  };
}
