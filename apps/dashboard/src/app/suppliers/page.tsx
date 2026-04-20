"use client";

import { suppliersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { SupplierDto } from "@drug-store/shared";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@drug-store/ui";
import { useCallback, useEffect, useState } from "react";

export default function SuppliersPage() {
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    if (!isHqUser) return;
    try {
      const res = await suppliersApi.listSuppliers();
      setSuppliers(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    }
  }, [isHqUser]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    setLoading(true);
    try {
      const created = await suppliersApi.createSupplier({
        name: name.trim(),
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
      });
      setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setContactEmail("");
      setContactPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <p className="mt-1 text-sm text-gray-500">
          HQ manages the supplier master list used for purchase orders.
        </p>
      </div>

      {!isHqUser && (
        <Alert variant="destructive">
          Only HQ users can manage suppliers. Switch to an HQ role to continue.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>New supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="supplier-name"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Supplier name
            </label>
            <Input
              id="supplier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isHqUser || loading}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="supplier-email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email (optional)
              </label>
              <Input
                id="supplier-email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!isHqUser || loading}
              />
            </div>
            <div>
              <label
                htmlFor="supplier-phone"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Phone (optional)
              </label>
              <Input
                id="supplier-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!isHqUser || loading}
              />
            </div>
          </div>
          <Button type="button" disabled={!isHqUser || loading} onClick={handleCreate}>
            {loading ? "Saving…" : "Add supplier"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier list</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <p className="text-sm text-gray-500">No suppliers yet.</p>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline_variant/20 bg-surface_container_lowest px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-on_surface">{supplier.name}</p>
                    <p className="text-xs text-on_surface_variant">
                      {supplier.contactEmail || supplier.contactPhone
                        ? `${supplier.contactEmail ?? "—"} · ${supplier.contactPhone ?? "—"}`
                        : "No contact details"}
                    </p>
                  </div>
                  <span className="text-xs text-on_surface_variant">
                    Added {new Date(supplier.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
