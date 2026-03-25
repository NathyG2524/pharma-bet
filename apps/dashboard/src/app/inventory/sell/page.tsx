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
import { medicinesApi, patientsApi } from '@/lib/api';
import type { MedicineDto } from '@drug-store/shared';
import { isValidPhone, normalizePhone, parseLocalDateTime } from '@/lib/validation';

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SellPage() {
  const [medicines, setMedicines] = useState<MedicineDto[]>([]);
  const [medicineId, setMedicineId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [recordedAt, setRecordedAt] = useState(() =>
    toLocalDatetimeValue(new Date()),
  );
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
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
    loadMedicines();
  }, [loadMedicines]);

  const selected = useMemo(
    () => medicines.find((m) => m.id === medicineId),
    [medicines, medicineId],
  );
  const remainingStock = selected ? selected.stockQuantity - quantity : null;
  const exceedsStock = remainingStock != null && remainingStock < 0;

  const handleLookupPatient = async () => {
    setLookupError(null);
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setPatientId(null);
      setPatientLabel(null);
      return;
    }
    if (!isValidPhone(normalizedPhone)) {
      setPatientId(null);
      setPatientLabel(null);
      setLookupError('Enter a valid phone number for lookup.');
      return;
    }
    setLookupLoading(true);
    try {
      const p = await patientsApi.getPatientByPhone(normalizedPhone);
      setPatientId(p.id);
      setPatientLabel(p.name ? `${p.name} (${p.phone})` : p.phone);
    } catch {
      setPatientId(null);
      setPatientLabel(null);
      setLookupError('Patient not found. Register first or sell as walk-in.');
    } finally {
      setLookupLoading(false);
    }
  };

  const clearPatient = () => {
    setPatientId(null);
    setPatientLabel(null);
    setPhone('');
    setLookupError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!medicineId || quantity < 1 || exceedsStock) return;
    setLoading(true);
    try {
      const iso = parseLocalDateTime(recordedAt);
      if (!iso) {
        setError('Enter a valid date and time.');
        setLoading(false);
        return;
      }
      await medicinesApi.sellMedicine(medicineId, {
        quantity,
        recordedAt: iso,
        unitPrice: unitPrice.trim() || undefined,
        notes: notes.trim() || undefined,
        ...(patientId ? { patientId } : {}),
      });
      setSuccess('Sale recorded.');
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Sell</h1>
      <Card>
        <CardHeader>
          <CardTitle>Record sale</CardTitle>
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
                        {m.name} (stock: {m.stockQuantity})
                      </option>
                    ))}
                  </Select>
                  {selected && (
                    <p className="mt-1 text-sm text-gray-500">
                      In stock: {selected.stockQuantity}
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
                max={selected?.stockQuantity}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value) || 1))
                }
                disabled={loading}
              />
              {remainingStock != null && !exceedsStock && (
                <p className="mt-1 text-sm text-gray-500">
                  Stock after sale: {remainingStock}
                </p>
              )}
            </div>
            {exceedsStock && (
              <Alert variant="destructive">
                Quantity exceeds available stock for this medicine.
              </Alert>
            )}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Patient (optional — walk-in if empty)
              </p>
              {patientLabel ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-900">{patientLabel}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearPatient}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="Phone to look up"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={lookupLoading || loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={lookupLoading || loading}
                      onClick={() => void handleLookupPatient()}
                    >
                      {lookupLoading ? '…' : 'Look up'}
                    </Button>
                  </div>
                  {lookupError && (
                    <p className="mt-2 text-sm text-amber-800">{lookupError}</p>
                  )}
                </>
              )}
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
                placeholder="e.g. 15.00"
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
                disabled={
                  loading || !medicines.length || !medicineId || exceedsStock
                }
              >
                {loading ? 'Saving…' : 'Record sale'}
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
