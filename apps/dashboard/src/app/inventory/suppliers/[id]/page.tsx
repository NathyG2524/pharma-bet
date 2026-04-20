"use client";

import { medicinesApi, suppliersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { CanonicalMedicineDto, SupplierDto, SupplierProductDto } from "@drug-store/shared";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "@drug-store/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = typeof params.id === "string" ? params.id : "";
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );

  const [supplier, setSupplier] = useState<SupplierDto | null>(null);
  const [mappings, setMappings] = useState<SupplierProductDto[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<CanonicalMedicineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [mappingMedicineId, setMappingMedicineId] = useState("");
  const [mappingSupplierSku, setMappingSupplierSku] = useState("");
  const [mappingPackSize, setMappingPackSize] = useState("");
  const [mappingPackUnit, setMappingPackUnit] = useState("");
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);
  const [mappingSaving, setMappingSaving] = useState(false);

  const loadSupplier = useCallback(async () => {
    if (!supplierId || !isHqUser) return;
    setLoading(true);
    setError(null);
    try {
      const [supplierRes, mappingRes] = await Promise.all([
        suppliersApi.getSupplier(supplierId),
        suppliersApi.listSupplierMappings(supplierId, { limit: 200, offset: 0 }),
      ]);
      setSupplier(supplierRes);
      setMappings(mappingRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplier");
      setSupplier(null);
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [supplierId, isHqUser]);

  const loadMedicines = useCallback(async () => {
    if (!isHqUser) return;
    try {
      const res = await medicinesApi.listCanonicalMedicines({
        limit: 200,
        offset: 0,
        includeInactive: true,
      });
      setMedicineOptions(res.items);
    } catch {
      setMedicineOptions([]);
    }
  }, [isHqUser]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  useEffect(() => {
    void loadMedicines();
  }, [loadMedicines]);

  useEffect(() => {
    if (!supplier) return;
    setName(supplier.name);
    setContactEmail(supplier.contactEmail ?? "");
    setContactPhone(supplier.contactPhone ?? "");
    setAddress(supplier.address ?? "");
    setNotes(supplier.notes ?? "");
  }, [supplier]);

  const resetMappingForm = useCallback(() => {
    setMappingMedicineId("");
    setMappingSupplierSku("");
    setMappingPackSize("");
    setMappingPackUnit("");
    setEditingMappingId(null);
  }, []);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      const updated = await suppliersApi.updateSupplier(supplier.id, {
        name: name.trim(),
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      setSupplier(updated);
      setSaveSuccess("Supplier updated.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleSupplierDelete = async () => {
    if (!supplier) return;
    const confirmed = window.confirm(
      `Delete supplier "${supplier.name}"? This will remove all mappings.`,
    );
    if (!confirmed) return;
    setSaving(true);
    setSaveError(null);
    try {
      await suppliersApi.deleteSupplier(supplier.id);
      router.push("/inventory/suppliers");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete supplier");
      setSaving(false);
    }
  };

  const handleMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    setMappingError(null);
    setMappingSuccess(null);
    const packSize = mappingPackSize.trim() ? Number.parseInt(mappingPackSize, 10) : null;
    if (packSize !== null && (Number.isNaN(packSize) || packSize < 1)) {
      setMappingError("Pack size must be a positive whole number.");
      return;
    }
    if (!mappingMedicineId) {
      setMappingError("Select a medicine to map.");
      return;
    }
    setMappingSaving(true);
    try {
      if (editingMappingId) {
        await suppliersApi.updateSupplierMapping(supplier.id, editingMappingId, {
          supplierSku: mappingSupplierSku.trim() || null,
          packSize,
          packUnit: mappingPackUnit.trim() || null,
        });
        setMappingSuccess("Mapping updated.");
      } else {
        await suppliersApi.createSupplierMapping(supplier.id, {
          medicineId: mappingMedicineId,
          supplierSku: mappingSupplierSku.trim() || null,
          packSize,
          packUnit: mappingPackUnit.trim() || null,
        });
        setMappingSuccess("Mapping added.");
      }
      await loadSupplier();
      resetMappingForm();
    } catch (err) {
      setMappingError(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setMappingSaving(false);
    }
  };

  const handleMappingDelete = async (mapping: SupplierProductDto) => {
    if (!supplier) return;
    const confirmed = window.confirm(
      `Remove mapping for "${mapping.medicine?.name ?? "medicine"}"?`,
    );
    if (!confirmed) return;
    setMappingSaving(true);
    setMappingError(null);
    try {
      await suppliersApi.deleteSupplierMapping(supplier.id, mapping.id);
      await loadSupplier();
    } catch (err) {
      setMappingError(err instanceof Error ? err.message : "Failed to delete mapping");
    } finally {
      setMappingSaving(false);
    }
  };

  const handleEditMapping = (mapping: SupplierProductDto) => {
    setEditingMappingId(mapping.id);
    setMappingMedicineId(mapping.medicineId);
    setMappingSupplierSku(mapping.supplierSku ?? "");
    setMappingPackSize(mapping.packSize != null ? String(mapping.packSize) : "");
    setMappingPackUnit(mapping.packUnit ?? "");
  };

  const mappingTitle = editingMappingId ? "Update mapping" : "Add mapping";
  const mappingButtonLabel = editingMappingId ? "Save mapping" : "Add mapping";

  const availableMedicines = useMemo(() => {
    if (medicineOptions.length === 0) return [];
    return medicineOptions.filter((medicine) => {
      if (editingMappingId && medicine.id === mappingMedicineId) return true;
      return !mappings.some((mapping) => mapping.medicineId === medicine.id);
    });
  }, [medicineOptions, mappings, editingMappingId, mappingMedicineId]);

  if (!isHqUser) {
    return (
      <div className="max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Supplier</h1>
        <Alert variant="destructive">Only HQ users can manage supplier records.</Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-4xl space-y-4">
        <Alert variant="destructive">{error ?? "Supplier not found."}</Alert>
        <Link href="/inventory/suppliers" className="text-blue-600">
          ← Back to suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/inventory/suppliers"
            className="mb-2 inline-block text-sm text-blue-600 hover:underline"
          >
            ← Suppliers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
        </div>
        <Button
          type="button"
          variant="destructive"
          disabled={saving}
          onClick={handleSupplierDelete}
        >
          Delete supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            <div>
              <label htmlFor="supplier-name" className="mb-1.5 block text-sm font-medium">
                Name
              </label>
              <Input
                id="supplier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="supplier-email" className="mb-1.5 block text-sm font-medium">
                  Contact email
                </label>
                <Input
                  id="supplier-email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="supplier-phone" className="mb-1.5 block text-sm font-medium">
                  Contact phone
                </label>
                <Input
                  id="supplier-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div>
              <label htmlFor="supplier-address" className="mb-1.5 block text-sm font-medium">
                Address
              </label>
              <Input
                id="supplier-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="supplier-notes" className="mb-1.5 block text-sm font-medium">
                Notes
              </label>
              <Input
                id="supplier-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
              />
            </div>
            {saveError && <Alert variant="destructive">{saveError}</Alert>}
            {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save supplier"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{mappingTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMappingSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="mapping-medicine" className="mb-1.5 block text-sm font-medium">
                  Medicine
                </label>
                <Select
                  id="mapping-medicine"
                  value={mappingMedicineId}
                  onChange={(e) => setMappingMedicineId(e.target.value)}
                  disabled={mappingSaving || !!editingMappingId}
                >
                  <option value="" disabled>
                    Select medicine
                  </option>
                  {availableMedicines.map((medicine) => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} {medicine.sku ? `(${medicine.sku})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="mapping-sku" className="mb-1.5 block text-sm font-medium">
                  Supplier SKU
                </label>
                <Input
                  id="mapping-sku"
                  value={mappingSupplierSku}
                  onChange={(e) => setMappingSupplierSku(e.target.value)}
                  disabled={mappingSaving}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="mapping-pack-size" className="mb-1.5 block text-sm font-medium">
                  Pack size
                </label>
                <Input
                  id="mapping-pack-size"
                  type="number"
                  min={1}
                  value={mappingPackSize}
                  onChange={(e) => setMappingPackSize(e.target.value)}
                  disabled={mappingSaving}
                />
              </div>
              <div>
                <label htmlFor="mapping-pack-unit" className="mb-1.5 block text-sm font-medium">
                  Pack unit
                </label>
                <Input
                  id="mapping-pack-unit"
                  value={mappingPackUnit}
                  onChange={(e) => setMappingPackUnit(e.target.value)}
                  disabled={mappingSaving}
                />
              </div>
            </div>
            {mappingError && <Alert variant="destructive">{mappingError}</Alert>}
            {mappingSuccess && <Alert variant="success">{mappingSuccess}</Alert>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={mappingSaving}>
                {mappingSaving ? "Saving…" : mappingButtonLabel}
              </Button>
              {editingMappingId && (
                <Button type="button" variant="outline" onClick={resetMappingForm}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapped products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
            <table className="w-full text-left text-sm text-on_surface_variant">
              <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                <tr>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Medicine
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Supplier SKU
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Pack
                  </th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-on_surface_variant">
                      No mapped products yet.
                    </td>
                  </tr>
                ) : (
                  mappings.map((mapping) => (
                    <tr
                      key={mapping.id}
                      className="transition-colors hover:bg-surface_container_high"
                    >
                      <td className="px-4 py-4 font-medium text-on_surface">
                        {mapping.medicine?.name ?? "Unknown"}{" "}
                        {mapping.medicine?.sku ? `(${mapping.medicine.sku})` : ""}
                      </td>
                      <td className="px-4 py-4">{mapping.supplierSku ?? "—"}</td>
                      <td className="px-4 py-4">
                        {mapping.packSize ? `${mapping.packSize} ${mapping.packUnit ?? ""}` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditMapping(mapping)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleMappingDelete(mapping)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
