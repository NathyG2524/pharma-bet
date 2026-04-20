"use client";

import { adjustmentsApi, inventoryApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { AdjustmentReasonCode, InventoryLotDto } from "@drug-store/shared";
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

const REASON_CODES: { value: AdjustmentReasonCode; label: string }[] = [
  { value: "shrink", label: "Shrink" },
  { value: "damage", label: "Damage" },
  { value: "expiry_destruction", label: "Expiry destruction" },
  { value: "samples", label: "Samples" },
  { value: "theft", label: "Theft" },
  { value: "other", label: "Other" },
];

export default function NewAdjustmentPage() {
  const { state } = useAuthContext();
  const router = useRouter();
  const canCreate = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );

  const [lots, setLots] = useState<InventoryLotDto[]>([]);
  const [lotId, setLotId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reasonCode, setReasonCode] = useState<AdjustmentReasonCode>("damage");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canCreate) return;
    setLoading(true);
    try {
      const res = await inventoryApi.listLots();
      setLots(res.items);
      if (res.items.length > 0) setLotId(res.items[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lots");
    } finally {
      setLoading(false);
    }
  }, [canCreate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    setError(null);
    const qty = Number.parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty === 0) {
      setError("Quantity must be a non-zero integer.");
      return;
    }
    if (!lotId) {
      setError("Select a lot.");
      return;
    }
    setSubmitting(true);
    try {
      const adj = await adjustmentsApi.createAdjustment({
        lotId,
        quantity: qty,
        reasonCode,
        notes: notes.trim() || undefined,
      });
      router.push(`/adjustments/${adj.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New inventory adjustment</h1>
        <p className="mt-1 text-sm text-gray-500">
          Request a lot-scoped quantity adjustment. Both BM and HQ approval are required before
          posting.
        </p>
      </div>

      {!canCreate && (
        <Alert variant="destructive">You need branch access to create adjustments.</Alert>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Adjustment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading lots…</p>
          ) : (
            <>
              <div>
                <label htmlFor="lot" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Lot
                </label>
                <Select
                  id="lot"
                  value={lotId}
                  onChange={(e) => setLotId(e.target.value)}
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
                  htmlFor="quantity"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Quantity (positive = increase, negative = decrease)
                </label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={!canCreate}
                />
              </div>

              <div>
                <label
                  htmlFor="reasonCode"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Reason code
                </label>
                <Select
                  id="reasonCode"
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as AdjustmentReasonCode)}
                  disabled={!canCreate}
                >
                  {REASON_CODES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
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

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canCreate || submitting}
                >
                  {submitting ? "Creating…" : "Create adjustment"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
