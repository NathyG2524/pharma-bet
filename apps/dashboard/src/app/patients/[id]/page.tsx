'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@drug-store/ui';
import { patientsApi } from '@/lib/api';
import type { PatientWithHistoryDto, PatientHistoryDto } from '@drug-store/shared';
import { parseLocalDateTime } from '@/lib/validation';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [patient, setPatient] = useState<PatientWithHistoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addRecordedAt, setAddRecordedAt] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [addSystolic, setAddSystolic] = useState('');
  const [addDiastolic, setAddDiastolic] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await patientsApi.getPatient(id);
      const history = await patientsApi.getHistory(id);
      setPatient({ ...p, history });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const iso = parseLocalDateTime(addRecordedAt);
      if (!iso) {
        setAddError('Enter a valid date and time.');
        setAdding(false);
        return;
      }
      await patientsApi.addHistory(id, {
        recordedAt: iso,
        bloodPressureSystolic: addSystolic ? Number(addSystolic) : undefined,
        bloodPressureDiastolic: addDiastolic ? Number(addDiastolic) : undefined,
        notes: addNotes.trim() || undefined,
      });
      setShowAddForm(false);
      setAddSystolic('');
      setAddDiastolic('');
      setAddNotes('');
      await load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add reading');
    } finally {
      setAdding(false);
    }
  };

  if (loading && !patient) {
    return <div className="text-gray-500">Loading…</div>;
  }
  if (error || !patient) {
    return (
      <div>
        <Alert variant="destructive">{error ?? 'Patient not found'}</Alert>
        <Link href="/" className="mt-2 inline-block text-sm text-emerald-600 hover:underline">
          Back to lookup
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.name || 'Patient'}
          </h1>
          <p className="text-gray-600">{patient.phone}</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">
            Back to lookup
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
            <p className="mt-1 font-medium text-gray-900">{patient.phone}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Latest reading</p>
            <p className="mt-1 text-sm text-gray-900">
              {patient.history[0]
                ? new Date(patient.history[0].recordedAt).toLocaleString()
                : 'No history'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Latest BP</p>
            <p className="mt-1 text-sm text-gray-900">
              {patient.history[0]?.bloodPressureSystolic != null ||
              patient.history[0]?.bloodPressureDiastolic != null
                ? `${patient.history[0]?.bloodPressureSystolic ?? '–'} / ${patient.history[0]?.bloodPressureDiastolic ?? '–'}`
                : '–'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>History</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setAddError(null);
              setAddRecordedAt(new Date().toISOString().slice(0, 16));
            }}
          >
            {showAddForm ? 'Cancel' : 'Add reading'}
          </Button>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <form
              onSubmit={handleAddReading}
              className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Date & time
                  </label>
                  <Input
                    type="datetime-local"
                    value={addRecordedAt}
                    onChange={(e) => setAddRecordedAt(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Blood pressure (systolic / diastolic)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="120"
                      value={addSystolic}
                      onChange={(e) => setAddSystolic(e.target.value)}
                    />
                    <span className="self-center text-gray-400">/</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="80"
                      value={addDiastolic}
                      onChange={(e) => setAddDiastolic(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <Textarea
                  placeholder="Optional notes"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                />
              </div>
              {addError && (
                <Alert className="mt-2" variant="destructive">
                  {addError}
                </Alert>
              )}
              <Button type="submit" disabled={adding} className="mt-4">
                {adding ? 'Adding…' : 'Add reading'}
              </Button>
            </form>
          )}

          {patient.history.length === 0 && !showAddForm ? (
            <p className="text-gray-500">No history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Blood pressure</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.history.map((row: PatientHistoryDto) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <td className="px-3 py-3">
                        {new Date(row.recordedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        {row.bloodPressureSystolic != null ||
                        row.bloodPressureDiastolic != null
                          ? `${row.bloodPressureSystolic ?? '–'} / ${row.bloodPressureDiastolic ?? '–'}`
                          : '–'}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{row.notes || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
