"use client";

import { medicinesApi, patientsApi, salesApi } from "@/lib/api";
import { isValidPhone, normalizePhone, parseLocalDateTime } from "@/lib/validation";
import type { MedicineDto, SaleDto } from "@drug-store/shared";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
} from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SaleLineForm = {
  id: string;
  medicineId: string;
  quantity: number;
  unitPrice: string;
};

const createFallbackId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createLineId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : createFallbackId();

const createLine = (medicineId = ""): SaleLineForm => ({
  id: createLineId(),
  medicineId,
  quantity: 1,
  unitPrice: "",
});

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDecimal(value: number) {
  return value.toFixed(4);
}

export default function SellPage() {
  const [medicines, setMedicines] = useState<MedicineDto[]>([]);
  const [lines, setLines] = useState<SaleLineForm[]>([createLine()]);
  const [recordedAt, setRecordedAt] = useState(() => toLocalDatetimeValue(new Date()));
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<SaleDto | null>(null);

  const loadMedicines = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await medicinesApi.listMedicines({ limit: 100, offset: 0 });
      setMedicines(res.items);
      setLines((prev) => {
        if (!res.items.length) return prev;
        return prev.map((line) => {
          if (line.medicineId) return line;
          const first = res.items[0];
          return {
            ...line,
            medicineId: first.id,
            unitPrice: line.unitPrice || first.localPrice || "",
          };
        });
      });
    } catch {
      setMedicines([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMedicines();
  }, [loadMedicines]);

  const quantitiesByMedicine = useMemo(() => {
    return lines.reduce<Record<string, number>>((acc, line) => {
      if (!line.medicineId) return acc;
      acc[line.medicineId] = (acc[line.medicineId] ?? 0) + line.quantity;
      return acc;
    }, {});
  }, [lines]);

  const lineTotals = useMemo(() => {
    return lines.map((line) => {
      const price = Number.parseFloat(line.unitPrice);
      if (!Number.isFinite(price)) return 0;
      return price * line.quantity;
    });
  }, [lines]);

  const subtotalEstimate = useMemo(
    () => lineTotals.reduce((sum, value) => sum + value, 0),
    [lineTotals],
  );
  const requiresPatient = useMemo(
    () =>
      lines.some((line) => {
        if (!line.medicineId) return false;
        const medicine = medicines.find((m) => m.id === line.medicineId);
        return medicine?.requiresPatient ?? false;
      }),
    [lines, medicines],
  );
  const isPatientMissing = requiresPatient && !patientId;

  const handleLookupPatient = async () => {
    setLookupError(null);
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setPatientId(null);
      setPatientLabel(null);
      return;
    }
    if (!isValidPhone(normalizedPhone)) {
      setPatientId(null);
      setPatientLabel(null);
      setLookupError("Enter a valid phone number for lookup.");
      return;
    }
    setLookupLoading(true);
    try {
      const p = await patientsApi.getPatientByPhone(normalizedPhone);
      setPatientId(p.id);
      setPatientLabel(p.name ? `${p.name} (${p.phone})` : p.phone);
    } catch {
      setPatientId(null);
      setPatientLabel(null);
      setLookupError("Patient not found. Register first or sell as walk-in.");
    } finally {
      setLookupLoading(false);
    }
  };

  const clearPatient = () => {
    setPatientId(null);
    setPatientLabel(null);
    setPhone("");
    setLookupError(null);
  };

  const handleLineChange = (id: string, updates: Partial<SaleLineForm>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...updates } : line)));
  };

  const handleMedicineChange = (id: string, medicineId: string) => {
    const selected = medicines.find((medicine) => medicine.id === medicineId);
    setLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              medicineId,
              unitPrice: line.unitPrice || selected?.localPrice || "",
            }
          : line,
      ),
    );
  };

  const addLine = () => {
    const first = medicines[0];
    setLines((prev) => [...prev, createLine(first?.id ?? "")]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== id) : prev));
  };

  const hasInvalidLine = lines.some((line) => {
    if (!line.medicineId) return true;
    if (line.quantity < 1) return true;
    const price = Number.parseFloat(line.unitPrice);
    return !Number.isFinite(price);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLastSale(null);
    if (!lines.length || hasInvalidLine) return;
    if (isPatientMissing) {
      setError("Patient is required for the selected medicine(s).");
      return;
    }
    setLoading(true);
    try {
      const iso = parseLocalDateTime(recordedAt);
      if (!iso) {
        setError("Enter a valid date and time.");
        setLoading(false);
        return;
      }
      const res = await salesApi.createSale({
        recordedAt: iso,
        notes: notes.trim() || undefined,
        ...(patientId ? { patientId } : {}),
        lines: lines.map((line) => ({
          medicineId: line.medicineId,
          quantity: line.quantity,
          unitPrice: line.unitPrice.trim(),
        })),
      });
      setSuccess("Sale recorded.");
      setLastSale(res);
      setNotes("");
      setLines([createLine()]);
      await loadMedicines();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">OTC checkout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Record sale</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {lines.map((line, index) => {
              const medicine = medicines.find((m) => m.id === line.medicineId);
              const committedQty = line.medicineId ? quantitiesByMedicine[line.medicineId] : 0;
              const remainingStock =
                medicine && committedQty != null ? medicine.stockQuantity - committedQty : null;
              const exceedsStock = remainingStock != null && remainingStock < 0;
              return (
                <div key={line.id} className="rounded-lg border border-outline_variant/30 p-4">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <p className="text-sm font-semibold text-on_surface_variant">
                      Line {index + 1}
                    </p>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(line.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`medicine-${line.id}`}
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Medicine
                      </label>
                      {listLoading ? (
                        <p className="text-sm text-gray-500">Loading list…</p>
                      ) : medicines.length === 0 ? (
                        <p className="text-sm text-gray-600">
                          No medicines.{" "}
                          <Link href="/inventory/new" className="underline">
                            Add one first
                          </Link>
                        </p>
                      ) : (
                        <>
                          <Select
                            id={`medicine-${line.id}`}
                            value={line.medicineId}
                            onChange={(e) => handleMedicineChange(line.id, e.target.value)}
                            disabled={loading}
                          >
                            {medicines.map((m) => {
                              const patientTag = m.requiresPatient ? ", patient required" : "";
                              const label = `${m.name} (stock: ${m.stockQuantity}${patientTag})`;
                              return (
                                <option key={m.id} value={m.id}>
                                  {label}
                                </option>
                              );
                            })}
                          </Select>
                          {medicine && (
                            <p className="mt-1 text-sm text-gray-500">
                              In stock: {medicine.stockQuantity}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor={`qty-${line.id}`}
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Quantity
                      </label>
                      <Input
                        id={`qty-${line.id}`}
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(line.id, {
                            quantity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        disabled={loading}
                      />
                      {remainingStock != null && !exceedsStock && (
                        <p className="mt-1 text-sm text-gray-500">
                          Stock after sale: {remainingStock}
                        </p>
                      )}
                      {exceedsStock && (
                        <p className="mt-1 text-sm text-tertiary">
                          Quantity exceeds available stock for this medicine.
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor={`price-${line.id}`}
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Unit price
                      </label>
                      <Input
                        id={`price-${line.id}`}
                        inputMode="decimal"
                        placeholder="e.g. 15.00"
                        value={line.unitPrice}
                        onChange={(e) => handleLineChange(line.id, { unitPrice: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 block text-sm font-medium text-gray-700">
                        Line subtotal (est.)
                      </p>
                      <div className="rounded-md border border-outline_variant/30 bg-surface_container_low px-3 py-2 text-sm">
                        {formatDecimal(lineTotals[index] ?? 0)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" onClick={addLine} disabled={loading}>
              Add line
            </Button>

            <div className="rounded-lg bg-surface_container_low p-4">
              <p className="mb-2 text-sm font-medium text-on_surface_variant">
                Patient {requiresPatient ? "(required - selected items)" : "(optional - walk-in)"}
              </p>
              {patientLabel ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-on_surface">{patientLabel}</span>
                  <Button type="button" variant="outline" size="sm" onClick={clearPatient}>
                    Clear
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="Phone to look up"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={lookupLoading || loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={lookupLoading || loading}
                      onClick={() => void handleLookupPatient()}
                    >
                      {lookupLoading ? "…" : "Look up"}
                    </Button>
                  </div>
                  {lookupError && <p className="mt-2 text-sm text-tertiary">{lookupError}</p>}
                </>
              )}
              {isPatientMissing && (
                <Alert variant="destructive" className="mt-3">
                  Patient is required for the selected medicine(s).
                </Alert>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="when" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Date & time
                </label>
                <Input
                  id="when"
                  type="datetime-local"
                  value={recordedAt}
                  onChange={(e) => setRecordedAt(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="rounded-lg border border-outline_variant/30 px-4 py-3">
              <p className="text-sm text-on_surface_variant">Subtotal estimate</p>
              <p className="text-lg font-semibold text-on_surface">
                {formatDecimal(subtotalEstimate)}
              </p>
            </div>

            {hasInvalidLine && (
              <Alert variant="destructive">Each line needs a medicine, quantity, and price.</Alert>
            )}
            {error && <Alert variant="destructive">{error}</Alert>}
            {success && (
              <Alert variant="success">
                <div className="flex flex-wrap items-center gap-3">
                  <span>{success}</span>
                  <Link href="/inventory" className="underline">
                    Back to list
                  </Link>
                </div>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading || !medicines.length || hasInvalidLine || isPatientMissing}
              >
                {loading ? "Saving…" : "Record sale"}
              </Button>
              <Link href="/inventory">
                <Button type="button" variant="outline">
                  Back to list
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {lastSale && (
        <Card>
          <CardHeader>
            <CardTitle>Sale summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-on_surface_variant">Subtotal</p>
                <p className="text-lg font-semibold text-on_surface">{lastSale.subtotal}</p>
              </div>
              <div>
                <p className="text-sm text-on_surface_variant">Tax total</p>
                <p className="text-lg font-semibold text-on_surface">{lastSale.taxTotal}</p>
              </div>
              <div>
                <p className="text-sm text-on_surface_variant">Total</p>
                <p className="text-lg font-semibold text-on_surface">{lastSale.totalAmount}</p>
              </div>
              <div>
                <p className="text-sm text-on_surface_variant">COGS</p>
                <p className="text-lg font-semibold text-on_surface">{lastSale.cogsTotal}</p>
              </div>
            </div>

            <div className="space-y-3">
              {lastSale.lines.map((line, index) => (
                <div key={line.id} className="rounded-lg border border-outline_variant/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-on_surface">
                      Line {index + 1}: {line.medicine?.name ?? "Medicine"}
                    </p>
                    <p className="text-sm text-on_surface_variant">
                      Qty {line.quantity} @ {line.unitPrice}
                    </p>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-on_surface_variant md:grid-cols-3">
                    <div>Tax: {line.taxAmount ?? "0.0000"}</div>
                    <div>Line total: {line.lineTotal}</div>
                    <div>COGS: {line.cogsAmount}</div>
                  </div>
                  {line.overrideReason && (
                    <p className="mt-2 text-sm text-tertiary">Override: {line.overrideReason}</p>
                  )}
                  <div className="mt-3">
                    <p className="text-sm font-medium text-on_surface_variant">Allocations</p>
                    <div className="mt-2 space-y-1 text-sm text-on_surface_variant">
                      {line.allocations.map((allocation) => (
                        <div key={allocation.id} className="flex flex-wrap gap-2">
                          <span>Lot {allocation.lotCode || allocation.lotId.slice(0, 8)}</span>
                          <span>Qty {allocation.quantity}</span>
                          <span>Cost {allocation.unitCost}</span>
                          {allocation.expiryDate && <span>Exp {allocation.expiryDate}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
