"use client";

import { inventoryApi, supplierReturnsApi, suppliersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { InventoryLotDto, SupplierDto } from "@drug-store/shared";
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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface LineEntry {
  lotId: string;
  quantity: string;
  notes: string;
}

export default function NewSupplierReturnPage() {
  const { state } = useAuthContext();
  const router = useRouter();
  const canCreate = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );

  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [lots, setLots] = useState<InventoryLotDto[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [sourcePurchaseOrderId, setSourcePurchaseOrderId] = useState("");
  const [sourceReceiptId, setSourceReceiptId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineEntry[]>([{ lotId: "", quantity: "1", notes: "" }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canCreate) return;
    setLoading(true);
    try {
      const [suppRes, lotRes] = await Promise.all([
        suppliersApi.listSuppliers(),
        inventoryApi.listLots(),
      ]);
      setSuppliers(suppRes.items);
      setLots(lotRes.items);
      if (suppRes.items.length > 0) setSupplierId(suppRes.items[0].id);
      if (lotRes.items.length > 0) {
        setLines([{ lotId: lotRes.items[0].id, quantity: "1", notes: "" }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [canCreate]);

  useEffect(() => {
    load();
  }, [load]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { lotId: lots.length > 0 ? lots[0].id : "", quantity: "1", notes: "" },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineEntry, value: string) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!supplierId) {
      setError("Select a supplier.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one return line.");
      return;
    }
    for (const line of lines) {
      if (!line.lotId) {
        setError("Select a lot for each line.");
        return;
      }
      const qty = Number.parseInt(line.quantity, 10);
      if (Number.isNaN(qty) || qty <= 0) {
        setError("Quantity must be a positive integer for each line.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const ret = await supplierReturnsApi.createReturn({
        supplierId,
        sourcePurchaseOrderId: sourcePurchaseOrderId.trim() || undefined,
        sourceReceiptId: sourceReceiptId.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((line) => ({
          lotId: line.lotId,
          quantity: Number.parseInt(line.quantity, 10),
          notes: line.notes.trim() || undefined,
        })),
      });
      if (ret) router.push(`/supplier-returns/${ret.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier return.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New supplier return</h1>
        <p className="mt-1 text-sm text-gray-500">
          Initiate a lot-scoped return. HQ confirmation and dual approval are required before
          dispatch.
        </p>
      </div>

      {!canCreate && (
        <Alert variant="destructive">You need branch access to create supplier returns.</Alert>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Return details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="supplier"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Supplier
                </label>
                <Select
                  id="supplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={!canCreate}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="po" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Source PO ID (optional)
                </label>
                <Input
                  id="po"
                  type="text"
                  value={sourcePurchaseOrderId}
                  onChange={(e) => setSourcePurchaseOrderId(e.target.value)}
                  placeholder="UUID of source purchase order"
                  disabled={!canCreate}
                />
              </div>

              <div>
                <label htmlFor="receipt" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Source receipt ID (optional)
                </label>
                <Input
                  id="receipt"
                  type="text"
                  value={sourceReceiptId}
                  onChange={(e) => setSourceReceiptId(e.target.value)}
                  placeholder="UUID of source receipt"
                  disabled={!canCreate}
                />
              </div>

              <div>
                <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for audit trail…"
                  disabled={!canCreate}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Return lines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable line indices used here
              <div key={index} className="rounded-md border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Line {index + 1}</span>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeLine(index)}
                      disabled={!canCreate}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`lot-${index}`}
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Lot
                  </label>
                  <Select
                    id={`lot-${index}`}
                    value={line.lotId}
                    onChange={(e) => updateLine(index, "lotId", e.target.value)}
                    disabled={!canCreate}
                  >
                    <option value="">Select lot</option>
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.medicineName} — {lot.lotCode} (on-hand: {lot.quantityOnHand}, exp:{" "}
                        {lot.expiryDate})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor={`qty-${index}`}
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Quantity (units to return)
                  </label>
                  <Input
                    id={`qty-${index}`}
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, "quantity", e.target.value)}
                    disabled={!canCreate}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`line-notes-${index}`}
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Line notes (optional)
                  </label>
                  <Input
                    id={`line-notes-${index}`}
                    type="text"
                    value={line.notes}
                    onChange={(e) => updateLine(index, "notes", e.target.value)}
                    placeholder="e.g. damaged packaging"
                    disabled={!canCreate}
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addLine} disabled={!canCreate}>
              + Add line
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && (
        <div className="flex justify-end">
          <Button type="button" onClick={handleSubmit} disabled={!canCreate || submitting}>
            {submitting ? "Creating…" : "Create return"}
          </Button>
        </div>
      )}
    </div>
  );
}
