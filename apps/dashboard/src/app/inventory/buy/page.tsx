'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
} from '@drug-store/ui';
import { medicinesApi } from '@/lib/api';
import type { MedicineDto } from '@drug-store/shared';
import { parseLocalDateTime } from '@/lib/validation';

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BuyStockPage() {
  const [medicines, setMedicines] = useState<MedicineDto[]>([]);
  const [medicineId, setMedicineId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [recordedAt, setRecordedAt] = useState(() =>
    toLocalDatetimeValue(new Date()),
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMedicines = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await medicinesApi.listMedicines({ limit: 100, offset: 0 });
      setMedicines(res.items);
      setMedicineId((prev) => {
        if (prev && res.items.some((m) => m.id === prev)) return prev;
        return res.items[0]?.id ?? '';
      });
    } catch {
      setMedicines([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMedicines();
  }, [loadMedicines]);

  const selected = useMemo(
    () => medicines.find((m) => m.id === medicineId),
    [medicines, medicineId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!medicineId || quantity < 1) return;
    setLoading(true);
    try {
      const iso = parseLocalDateTime(recordedAt);
      if (!iso) {
        setError('Enter a valid date and time.');
        setLoading(false);
        return;
      }
      await medicinesApi.buyMedicine(medicineId, {
        quantity,
        recordedAt: iso,
        unitPrice: unitPrice.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess('Purchase recorded.');
      setNotes('');
      setUnitPrice('');
      await loadMedicines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Buy stock</h1>
      <Card>
        <CardHeader>
          <CardTitle>Record purchase</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="medicine"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Medicine
              </label>
              {listLoading ? (
                <p className="text-sm text-gray-500">Loading list…</p>
              ) : medicines.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No medicines.{' '}
                  <Link href="/inventory/new" className="underline">
                    Add one first
                  </Link>
                </p>
              ) : (
                <>
                  <Select
                    id="medicine"
                    value={medicineId}
                    onChange={(e) => setMedicineId(e.target.value)}
                    disabled={loading}
                  >
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (stock: {m.stockQuantity}
                        {m.unit ? ` ${m.unit}` : ''})
                      </option>
                    ))}
                  </Select>
                  {selected && (
                    <p className="mt-1 text-sm text-gray-500">
                      Current stock: {selected.stockQuantity}
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <label
                htmlFor="qty"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Quantity
              </label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value) || 1))
                }
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="when"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Date & time
              </label>
              <Input
                id="when"
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="price"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Unit price (optional)
              </label>
              <Input
                id="price"
                inputMode="decimal"
                placeholder="e.g. 12.50"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="notes"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Notes (optional)
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                <div className="flex flex-wrap items-center gap-3">
                  <span>{success}</span>
                  <Link href="/inventory" className="underline">
                    Back to list
                  </Link>
                  <Link href={`/inventory/${medicineId}`} className="underline">
                    View medicine
                  </Link>
                </div>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading || !medicines.length || !medicineId}
              >
                {loading ? 'Saving…' : 'Record buy'}
              </Button>
              <Link href="/inventory">
                <Button type="button" variant="outline">
                  Back to list
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
