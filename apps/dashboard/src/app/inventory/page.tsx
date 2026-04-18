"use client";

import { medicinesApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { CanonicalMedicineDto, MedicineDto } from "@drug-store/shared";
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
import { useCallback, useEffect, useState } from "react";

export default function InventoryPage() {
  const LOW_STOCK = 10;
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<MedicineDto[]>([]);
  const [catalogItems, setCatalogItems] = useState<CanonicalMedicineDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isHqUser) {
        const res = await medicinesApi.listCanonicalMedicines({
          search: debounced || undefined,
          limit: 100,
          offset: 0,
        });
        setCatalogItems(res.items);
        setItems([]);
        setTotal(res.total);
      } else {
        const res = await medicinesApi.listMedicines({
          search: debounced || undefined,
          limit: 100,
          offset: 0,
        });
        setItems(res.items);
        setCatalogItems([]);
        setTotal(res.total);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItems([]);
      setCatalogItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, isHqUser]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
        <div className="flex gap-2">
          {isHqUser && (
            <Link href="/inventory/new">
              <Button type="button">Add medicine</Button>
            </Link>
          )}
        </div>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Filter by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search medicines"
          />
          <p className="mt-2 text-sm text-gray-500">
            {loading ? "Loading…" : `${total} medicine(s)`}
          </p>
        </CardContent>
      </Card>
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
        {isHqUser ? (
          <table className="w-full text-left text-sm text-on_surface_variant">
            <thead className="sticky top-0 z-10 bg-surface_container_lowest">
              <tr>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  Name
                </th>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  SKU
                </th>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  Unit
                </th>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  Status
                </th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody>
              {catalogItems.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-on_surface_variant">
                    No catalog medicines yet.{" "}
                    <Link
                      href="/inventory/new"
                      className="font-medium text-primary underline hover:text-primary_container"
                    >
                      Add one
                    </Link>
                  </td>
                </tr>
              ) : (
                catalogItems.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-surface_container_high">
                    <td className="px-4 py-4 font-medium text-on_surface">{m.name}</td>
                    <td className="px-4 py-4">{m.sku ?? "—"}</td>
                    <td className="px-4 py-4">{m.unit ?? "—"}</td>
                    <td className="px-4 py-4 text-on_surface">
                      {m.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge>Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/inventory/${m.id}`}
                        className="font-medium text-primary hover:text-primary_container hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm text-on_surface_variant">
            <thead className="sticky top-0 z-10 bg-surface_container_lowest">
              <tr>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  Name
                </th>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  SKU
                </th>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  Unit
                </th>
                <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                  Stock
                </th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-on_surface_variant">
                    No medicines yet. Ask HQ to publish a product.
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-surface_container_high">
                    <td className="px-4 py-4 font-medium text-on_surface">{m.name}</td>
                    <td className="px-4 py-4">{m.sku ?? "—"}</td>
                    <td className="px-4 py-4">{m.unit ?? "—"}</td>
                    <td className="px-4 py-4 text-on_surface">
                      <div className="flex items-center gap-2">
                        <span>{m.stockQuantity}</span>
                        {m.stockQuantity <= LOW_STOCK && <Badge variant="warning">Low stock</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/inventory/${m.id}`}
                        className="font-medium text-primary hover:text-primary_container hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
