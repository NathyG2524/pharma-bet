"use client";

import { stockCountsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@drug-store/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewStockCountSessionPage() {
  const { state } = useAuthContext();
  const router = useRouter();
  const canCreate = state.roles.some((role) =>
    ["branch_manager", "branch_user", "hq_admin", "hq_user", "platform_admin"].includes(role),
  );

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const session = await stockCountsApi.createSession({
        notes: notes.trim() || undefined,
      });
      router.push(`/stock-counts/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New stock count session</h1>
        <p className="mt-1 text-sm text-gray-500">
          Open a new count session. Record lot variances, then submit for dual approval.
        </p>
      </div>

      {!canCreate && (
        <Alert variant="destructive">You need branch access to create stock count sessions.</Alert>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. quarterly count, aisle 3 recount…"
              disabled={!canCreate}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canCreate || submitting}
            >
              {submitting ? "Opening…" : "Open session"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
