"use client";

import { medicinesApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { DedupeHintDto } from "@drug-store/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@drug-store/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function NewDraftMedicinePage() {
  const router = useRouter();
  const { state } = useAuthContext();
  const isBranchUser = state.roles.some((role) => ["branch_manager", "branch_user"].includes(role));
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [dedupeHints, setDedupeHints] = useState<DedupeHintDto[]>([]);
  const [dedupeLoading, setDedupeLoading] = useState(false);

  const checkDedupe = useCallback(async () => {
    if (!name.trim() && !sku.trim() && !barcode.trim()) {
      setDedupeHints([]);
      return;
    }
    setDedupeLoading(true);
    try {
      const res = await medicinesApi.dedupeCheck({
        name: name.trim() || undefined,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
      });
      setDedupeHints(res.hints);
    } catch {
      setDedupeHints([]);
    } finally {
      setDedupeLoading(false);
    }
  }, [name, sku, barcode]);

  useEffect(() => {
    const t = setTimeout(() => {
      void checkDedupe();
    }, 500);
    return () => clearTimeout(t);
  }, [checkDedupe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNameError(null);
    if (!isBranchUser) {
      setError("Only branch users can create draft medicines.");
      return;
    }
    if (!name.trim()) {
      setNameError("Medicine name is required.");
      return;
    }
    setLoading(true);
    try {
      const m = await medicinesApi.createDraftMedicine({
        name: name.trim(),
        sku: sku.trim() || undefined,
        unit: unit.trim() || undefined,
        barcode: barcode.trim() || undefined,
      });
      router.push(`/inventory/${m.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add draft medicine</h1>
      <Alert variant="warning" className="mb-4">
        <strong>Draft product</strong> — visible only to this branch until HQ promotes it to the
        canonical catalog. Draft SKUs cannot be used on HQ purchase orders.
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Draft entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isBranchUser && (
              <Alert variant="destructive">
                Only branch users can create draft medicines. Switch to a branch role to continue.
              </Alert>
            )}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Name <span className="text-red-600">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameError(name.trim() ? null : "Medicine name is required.")}
                disabled={loading || !isBranchUser}
                required
              />
              {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
            </div>
            <div>
              <label htmlFor="sku" className="mb-1.5 block text-sm font-medium text-gray-700">
                SKU (optional)
              </label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={loading || !isBranchUser}
              />
            </div>
            <div>
              <label htmlFor="unit" className="mb-1.5 block text-sm font-medium text-gray-700">
                Unit (optional)
              </label>
              <Input
                id="unit"
                placeholder="e.g. tablet, bottle"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={loading || !isBranchUser}
              />
            </div>
            <div>
              <label htmlFor="barcode" className="mb-1.5 block text-sm font-medium text-gray-700">
                Barcode / GTIN (optional)
              </label>
              <Input
                id="barcode"
                placeholder="e.g. 5901234123457"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={loading || !isBranchUser}
              />
            </div>

            {dedupeHints.length > 0 && (
              <Alert variant="warning">
                <strong>Possible duplicate{dedupeHints.length > 1 ? "s" : ""} detected</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  {dedupeHints.map((h) => (
                    <li key={h.id} className="flex items-center gap-2">
                      <span className="font-medium">{h.name}</span>
                      {h.sku && <span className="text-gray-500">SKU: {h.sku}</span>}
                      {h.barcode && <span className="text-gray-500">Barcode: {h.barcode}</span>}
                      <Badge variant={h.status === "draft" ? "warning" : "success"}>
                        {h.status === "draft" ? "Draft" : "Canonical"}
                      </Badge>
                      <span className="text-gray-400">Matched on: {h.matchedOn.join(", ")}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  Review the existing products above before creating a duplicate.
                </p>
              </Alert>
            )}
            {dedupeLoading && <p className="text-xs text-gray-400">Checking for duplicates…</p>}

            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !isBranchUser}>
                {loading ? "Saving…" : "Create draft"}
              </Button>
              <Link href="/inventory">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
