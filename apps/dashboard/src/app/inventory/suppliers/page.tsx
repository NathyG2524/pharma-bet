"use client";

import { suppliersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { SupplierDto } from "@drug-store/shared";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function SuppliersPage() {
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );

  const [items, setItems] = useState<SupplierDto[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!isHqUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await suppliersApi.listSuppliers({
        search: debounced || undefined,
        limit: 100,
        offset: 0,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, isHqUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await suppliersApi.createSupplier({
        name: name.trim(),
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
      });
      setName("");
      setContactEmail("");
      setContactPhone("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setSaving(false);
    }
  };

  const suppliersTable = useMemo(() => {
    if (loading) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-8 text-center text-on_surface_variant">
            Loading…
          </td>
        </tr>
      );
    }
    if (items.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-8 text-center text-on_surface_variant">
            No suppliers yet. Add one to start mapping products.
          </td>
        </tr>
      );
    }
    return items.map((supplier) => (
      <tr key={supplier.id} className="transition-colors hover:bg-surface_container_high">
        <td className="px-4 py-4 font-medium text-on_surface">{supplier.name}</td>
        <td className="px-4 py-4">{supplier.contactEmail ?? "—"}</td>
        <td className="px-4 py-4">{supplier.contactPhone ?? "—"}</td>
        <td className="px-4 py-4 text-right">
          <Link
            href={`/inventory/suppliers/${supplier.id}`}
            className="font-medium text-primary hover:text-primary_container hover:underline"
          >
            View
          </Link>
        </td>
      </tr>
    ));
  }, [items, loading]);

  if (!isHqUser) {
    return (
      <div className="max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <Alert variant="destructive">Only HQ users can manage supplier records.</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Maintain HQ-only supplier records and catalog mappings.
          </p>
        </div>
        <Link href="/inventory">
          <Button type="button" variant="outline">
            Back to medicines
          </Button>
        </Link>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Add supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="supplier-name" className="mb-1.5 block text-sm font-medium">
                  Supplier name
                </label>
                <Input
                  id="supplier-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Supplier name"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="supplier-email" className="mb-1.5 block text-sm font-medium">
                  Contact email
                </label>
                <Input
                  id="supplier-email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="purchasing@vendor.com"
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
                  placeholder="(555) 123-4567"
                  disabled={saving}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create supplier"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search suppliers by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search suppliers"
          />
          <p className="text-sm text-gray-500">{loading ? "Loading…" : `${total} supplier(s)`}</p>
          <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
            <table className="w-full text-left text-sm text-on_surface_variant">
              <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                <tr>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Name
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody>{suppliersTable}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
