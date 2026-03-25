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
import { patientsApi } from '@/lib/api';
import { isValidPhone, normalizePhone } from '@/lib/validation';

export default function HomePage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const router = useRouter();

  const handleLookup = async (e: React.FormEvent) => {
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
      const data = await patientsApi.getPatientByPhone(normalizedPhone);
      router.push(`/patients/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Patient not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Patient lookup
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Enter phone number</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Phone
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
                disabled={loading}
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-600">{phoneError}</p>
              )}
            </div>
            {error && (
              <Alert variant="destructive">
                {error}
                <span className="ml-2">
                  <Link
                    href={`/patients/new?phone=${encodeURIComponent(phone)}`}
                    className="font-medium underline"
                  >
                    Register patient
                  </Link>
                </span>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Looking up…' : 'Look up'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
