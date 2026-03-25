'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@drug-store/ui';
import { medicinesApi } from '@/lib/api';

export default function NewMedicinePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNameError(null);
    if (!name.trim()) {
      setNameError('Medicine name is required.');
      return;
    }
    setLoading(true);
    try {
      const m = await medicinesApi.createMedicine({
        name: name.trim(),
        sku: sku.trim() || undefined,
        unit: unit.trim() || undefined,
      });
      router.push(`/inventory/${m.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add medicine</h1>
      <Card>
        <CardHeader>
          <CardTitle>Catalog entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Name <span className="text-red-600">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() =>
                  setNameError(name.trim() ? null : 'Medicine name is required.')
                }
                disabled={loading}
                required
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-600">{nameError}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="sku"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                SKU (optional)
              </label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="unit"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Unit (optional)
              </label>
              <Input
                id="unit"
                placeholder="e.g. tablet, bottle"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Create'}
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
