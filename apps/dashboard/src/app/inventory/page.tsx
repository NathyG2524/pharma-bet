'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@drug-store/ui';
import { medicinesApi } from '@/lib/api';
import type { MedicineDto } from '@drug-store/shared';

export default function InventoryPage() {
  const LOW_STOCK = 10;
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<MedicineDto[]>([]);
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
      const res = await medicinesApi.listMedicines({
        search: debounced || undefined,
        limit: 100,
        offset: 0,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
        <div className="flex gap-2">
          <Link href="/inventory/new">
            <Button type="button">Add medicine</Button>
          </Link>
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
            {loading ? 'Loading…' : `${total} medicine(s)`}
          </p>
        </CardContent>
      </Card>
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 font-medium text-gray-700">SKU</th>
              <th className="px-4 py-3 font-medium text-gray-700">Unit</th>
              <th className="px-4 py-3 font-medium text-gray-700">Stock</th>
              <th className="px-4 py-3 font-medium text-gray-700" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No medicines yet.{' '}
                  <Link href="/inventory/new" className="font-medium underline">
                    Add one
                  </Link>
                </td>
              </tr>
            ) : (
              items.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-100 transition-colors even:bg-gray-50/50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.unit ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{m.stockQuantity}</span>
                      {m.stockQuantity <= LOW_STOCK && (
                        <Badge variant="warning">Low stock</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/inventory/${m.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      View
                    </Link>
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
