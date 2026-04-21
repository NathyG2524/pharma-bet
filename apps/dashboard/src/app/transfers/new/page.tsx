"use client";

import { branchesApi, medicinesApi, transfersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { BranchDto, CreateTransferInput, MedicineDto } from "@drug-store/shared";
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
import { useCallback, useEffect, useMemo, useState } from "react";

type FormLine = {
  id: string;
  medicineId: string;
  quantity: string;
};

const fallbackId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createLineId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : fallbackId();

const createLine = (): FormLine => ({
  id: createLineId(),
  medicineId: "",
  quantity: "1",
});

export default function NewTransferPage() {
  const { state } = useAuthContext();
  const router = useRouter();
  const canManageTransfers = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [medicines, setMedicines] = useState<MedicineDto[]>([]);
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<FormLine[]>([createLine()]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canManageTransfers) return;
    setLoading(true);
    setError(null);
    try {
      const [branchData, medicineData] = await Promise.all([
        branchesApi.listBranches(),
        medicinesApi.listMedicines({ limit: 200, offset: 0 }),
      ]);
      const filteredBranches = branchData.filter((branch) => branch.id !== state.activeBranchId);
      setBranches(filteredBranches);
      setMedicines(medicineData.items);
      if (!destinationBranchId && filteredBranches.length) {
        setDestinationBranchId(filteredBranches[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfer data");
    } finally {
      setLoading(false);
    }
  }, [canManageTransfers, destinationBranchId, state.activeBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const medicineOptions = useMemo(
    () => medicines.map((medicine) => ({ value: medicine.id, label: medicine.name })),
    [medicines],
  );

  const buildPayload = (): CreateTransferInput | null => {
    setError(null);
    if (!destinationBranchId) {
      setError("Select a destination branch.");
      return null;
    }
    const cleanedLines = lines
      .map((line) => ({
        medicineId: line.medicineId,
        quantity: Number(line.quantity),
      }))
      .filter((line) => line.medicineId);
    if (!cleanedLines.length) {
      setError("Add at least one medicine line.");
      return null;
    }
    for (const line of cleanedLines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        setError("Line quantities must be greater than zero.");
        return null;
      }
    }
    return {
      destinationBranchId,
      notes: notes.trim() || undefined,
      lines: cleanedLines,
    };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setLoading(true);
    try {
      const created = await transfersApi.createTransfer(payload);
      router.push(`/transfers/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create transfer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New transfer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create an inter-branch transfer from your active branch.
        </p>
      </div>

      {!canManageTransfers && (
        <Alert variant="destructive">
          You need branch access to create transfers. Update your role or branch assignment to
          continue.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Transfer details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading transfer data…</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="destination"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Destination branch
                  </label>
                  <Select
                    id="destination"
                    value={destinationBranchId}
                    onChange={(e) => setDestinationBranchId(e.target.value)}
                    disabled={!canManageTransfers}
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
                  placeholder="Optional shipping notes"
                  disabled={!canManageTransfers}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Line items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canManageTransfers}
                    onClick={() => setLines((prev) => [...prev, createLine()])}
                  >
                    Add line
                  </Button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div
                      key={line.id}
                      className="grid gap-3 rounded-lg border border-outline_variant/20 bg-surface_container_lowest p-4 md:grid-cols-[2fr_1fr_auto]"
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
                        disabled={!canManageTransfers}
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
                        disabled={!canManageTransfers}
                      />
                      <Button
                        type="button"
                        variant="tertiary"
                        disabled={!canManageTransfers || lines.length === 1}
                        onClick={() =>
                          setLines((prev) => prev.filter((item) => item.id !== line.id))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleSubmit} disabled={!canManageTransfers}>
                  Create transfer
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
