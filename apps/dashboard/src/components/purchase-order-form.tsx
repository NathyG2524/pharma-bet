"use client";

import type {
  BranchDto,
  CanonicalMedicineDto,
  CreatePurchaseOrderInput,
  PurchaseOrderLineInput,
  SupplierDto,
} from "@drug-store/shared";
import { Alert, Button, Input, Select, Textarea } from "@drug-store/ui";
import { useMemo, useState } from "react";

type FormLine = {
  id: string;
  medicineId: string;
  quantity: string;
  unitCost: string;
};

type PurchaseOrderFormProps = {
  suppliers: SupplierDto[];
  branches: BranchDto[];
  medicines: CanonicalMedicineDto[];
  initialValues?: {
    supplierId?: string;
    branchId?: string;
    notes?: string | null;
    lines?: PurchaseOrderLineInput[];
  };
  onSave?: (payload: CreatePurchaseOrderInput) => Promise<void>;
  onSubmit?: (payload: CreatePurchaseOrderInput) => Promise<void>;
  saveLabel?: string;
  submitLabel?: string;
  disabled?: boolean;
};

const createLine = (): FormLine => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
  medicineId: "",
  quantity: "1",
  unitCost: "",
});

export function PurchaseOrderForm({
  suppliers,
  branches,
  medicines,
  initialValues,
  onSave,
  onSubmit,
  saveLabel = "Save draft",
  submitLabel = "Submit for approval",
  disabled = false,
}: PurchaseOrderFormProps) {
  const [supplierId, setSupplierId] = useState(initialValues?.supplierId ?? "");
  const [branchId, setBranchId] = useState(initialValues?.branchId ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [lines, setLines] = useState<FormLine[]>(
    initialValues?.lines?.length
      ? initialValues.lines.map((line) => ({
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${line.medicineId}`,
          medicineId: line.medicineId,
          quantity: String(line.quantity),
          unitCost: line.unitCost ?? "",
        }))
      : [createLine()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const medicineOptions = useMemo(
    () => medicines.map((medicine) => ({ value: medicine.id, label: medicine.name })),
    [medicines],
  );

  const buildPayload = (): CreatePurchaseOrderInput | null => {
    setError(null);
    if (!supplierId) {
      setError("Select a supplier before saving.");
      return null;
    }
    if (!branchId) {
      setError("Select a receiving branch before saving.");
      return null;
    }
    const cleanedLines: PurchaseOrderLineInput[] = [];
    for (const line of lines) {
      if (!line.medicineId) {
        setError("Every line must include a medicine.");
        return null;
      }
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError("Line quantities must be greater than zero.");
        return null;
      }
      cleanedLines.push({
        medicineId: line.medicineId,
        quantity: qty,
        unitCost: line.unitCost.trim() || undefined,
      });
    }
    if (!cleanedLines.length) {
      setError("Add at least one line item.");
      return null;
    }
    return {
      supplierId,
      branchId,
      notes: notes.trim() || undefined,
      lines: cleanedLines,
    };
  };

  const handleAction = async (action: "save" | "submit") => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      if (action === "save") {
        await onSave?.(payload);
      } else {
        await onSubmit?.(payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save purchase order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="supplier" className="mb-1.5 block text-sm font-medium text-gray-700">
            Supplier
          </label>
          <Select
            id="supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={disabled || saving}
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="branch" className="mb-1.5 block text-sm font-medium text-gray-700">
            Receive at branch
          </label>
          <Select
            id="branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={disabled || saving}
          >
            <option value="">Select branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled || saving}
          placeholder="Optional internal notes for the branch"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Line items</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving}
            onClick={() => setLines((prev) => [...prev, createLine()])}
          >
            Add line
          </Button>
        </div>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={line.id}
              className="grid gap-3 rounded-lg border border-outline_variant/20 bg-surface_container_lowest p-4 md:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <Select
                value={line.medicineId}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, medicineId: e.target.value } : item,
                    ),
                  )
                }
                disabled={disabled || saving}
              >
                <option value="">Select medicine</option>
                {medicineOptions.map((medicine) => (
                  <option key={medicine.value} value={medicine.value}>
                    {medicine.label}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, quantity: e.target.value } : item,
                    ),
                  )
                }
                disabled={disabled || saving}
                placeholder="Qty"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.unitCost}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, unitCost: e.target.value } : item,
                    ),
                  )
                }
                disabled={disabled || saving}
                placeholder="Unit cost"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || saving || lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((_item, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {(onSave || onSubmit) && (
        <div className="flex flex-wrap gap-2">
          {onSave && (
            <Button
              type="button"
              disabled={disabled || saving}
              onClick={() => handleAction("save")}
            >
              {saving ? "Saving…" : saveLabel}
            </Button>
          )}
          {onSubmit && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || saving}
              onClick={() => handleAction("submit")}
            >
              {saving ? "Submitting…" : submitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
