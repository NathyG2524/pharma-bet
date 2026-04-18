"use client";

import { medicinesApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@drug-store/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMedicinePage() {
  const router = useRouter();
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNameError(null);
    if (!isHqUser) {
      setError("Only HQ users can create canonical medicines.");
      return;
    }
    if (!name.trim()) {
      setNameError("Medicine name is required.");
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
      setError(err instanceof Error ? err.message : "Failed to create");
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
            {!isHqUser && (
              <Alert variant="destructive">
                Only HQ catalog roles can create canonical medicines. Switch roles to HQ to
                continue.
              </Alert>
            )}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Name <span className="text-red-600">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameError(name.trim() ? null : "Medicine name is required.")}
                disabled={loading || !isHqUser}
                required
              />
              {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
            </div>
            <div>
              <label htmlFor="sku" className="mb-1.5 block text-sm font-medium text-gray-700">
                SKU (optional)
              </label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={loading || !isHqUser}
              />
            </div>
            <div>
              <label htmlFor="unit" className="mb-1.5 block text-sm font-medium text-gray-700">
                Unit (optional)
              </label>
              <Input
                id="unit"
                placeholder="e.g. tablet, bottle"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={loading || !isHqUser}
              />
            </div>
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !isHqUser}>
                {loading ? "Saving…" : "Create"}
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
