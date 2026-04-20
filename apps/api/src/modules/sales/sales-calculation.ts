import { computeLineTax } from "../taxes/tax-calculation";
import type { LotAllocation } from "./sales-allocation";

const DEFAULT_SCALE = 4;

const parseDecimal = (value: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid decimal value");
  }
  return parsed;
};

const roundToScale = (value: number, scale = DEFAULT_SCALE): number => {
  const factor = 10 ** scale;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const formatDecimal = (value: number, scale = DEFAULT_SCALE): string =>
  roundToScale(value, scale).toFixed(scale);

export const ZERO_DECIMAL = formatDecimal(0);

export const multiplyDecimal = (value: string, quantity: number, scale = DEFAULT_SCALE): string => {
  const parsed = parseDecimal(value);
  return formatDecimal(parsed * quantity, scale);
};

export const sumDecimalStrings = (values: string[], scale = DEFAULT_SCALE): string => {
  const total = values.reduce((acc, raw) => acc + parseDecimal(raw), 0);
  return formatDecimal(total, scale);
};

export const addDecimalStrings = (left: string, right: string, scale = DEFAULT_SCALE): string =>
  sumDecimalStrings([left, right], scale);

export const computeCogs = (allocations: LotAllocation[]): string =>
  sumDecimalStrings(
    allocations.map((allocation) => multiplyDecimal(allocation.unitCost, allocation.quantity)),
  );

export const computeLineTotals = (params: {
  quantity: number;
  unitPrice: string;
  taxRate: string | null;
}): {
  taxBase: string | null;
  taxRate: string | null;
  taxAmount: string | null;
  lineSubtotal: string;
  lineTotal: string;
} => {
  const tax = computeLineTax({
    quantity: params.quantity,
    unitPrice: params.unitPrice,
    taxRate: params.taxRate,
  });
  const lineSubtotal = tax.taxBase ?? multiplyDecimal(params.unitPrice, params.quantity);
  const taxAmount = tax.taxAmount ?? ZERO_DECIMAL;
  const lineTotal = addDecimalStrings(lineSubtotal, taxAmount);
  return { ...tax, lineSubtotal, lineTotal };
};
