'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@drug-store/ui';
import { patientsApi } from '@/lib/api';
import { isValidPhone, normalizePhone } from '@/lib/validation';

function NewPatientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get('phone');
    if (q) setPhone(q);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneError(null);
    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      setPhoneError('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const patient = await patientsApi.createPatient({
        phone: normalizedPhone,
        name: name.trim() || undefined,
      });
      router.push(`/patients/${patient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New patient</h1>
      <Card>
        <CardHeader>
          <CardTitle>Register patient</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Phone *
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() =>
                  setPhoneError(
                    phone && !isValidPhone(phone) ? 'Enter a valid phone number.' : null,
                  )
                }
                required
                disabled={loading}
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-600">{phoneError}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Name (optional)
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Patient name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create patient'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewPatientPage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
      <NewPatientForm />
    </Suspense>
  );
}
