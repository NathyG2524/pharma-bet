"use client";

import { medicinesApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { CanonicalMedicineDto } from "@drug-store/shared";
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

export default function DraftMedicinesPage() {
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<CanonicalMedicineDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await medicinesApi.listDraftMedicines({
        search: debounced || undefined,
        limit: 100,
        offset: 0,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePromote = async (id: string) => {
    setPromoteError(null);
    setPromotingId(id);
    try {
      await medicinesApi.promoteDraftMedicine(id);
      await load();
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : "Failed to promote");
    } finally {
      setPromotingId(null);
    }
  };

  if (!isHqUser) {
    return (
      <div className="max-w-5xl">
        <Alert variant="destructive">Only HQ users can view draft medicines for promotion.</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/inventory"
            className="mb-2 inline-block text-sm text-blue-600 hover:underline"
          >
            ← Medicines
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Draft medicines</h1>
          <p className="mt-1 text-sm text-gray-500">
            Branch-created draft products awaiting promotion to canonical catalog.
          </p>
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
            aria-label="Search draft medicines"
          />
          <p className="mt-2 text-sm text-gray-500">
            {loading ? "Loading…" : `${total} draft medicine(s)`}
          </p>
        </CardContent>
      </Card>
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      {promoteError && (
        <Alert variant="destructive" className="mb-4">
          {promoteError}
        </Alert>
      )}
      <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
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
                Branch
              </th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-on_surface_variant">
                  No draft medicines pending promotion.
                </td>
              </tr>
            ) : (
              items.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-surface_container_high">
                  <td className="px-4 py-4 font-medium text-on_surface">
                    <div className="flex items-center gap-2">
                      {m.name}
                      <Badge variant="warning">Draft</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4">{m.sku ?? "—"}</td>
                  <td className="px-4 py-4">{m.unit ?? "—"}</td>
                  <td className="px-4 py-4 font-mono text-xs text-gray-400">
                    {m.draftBranchId ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/inventory/${m.id}`}
                        className="font-medium text-primary hover:text-primary_container hover:underline"
                      >
                        View
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        disabled={promotingId === m.id}
                        onClick={() => void handlePromote(m.id)}
                      >
                        {promotingId === m.id ? "Promoting…" : "Promote"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
