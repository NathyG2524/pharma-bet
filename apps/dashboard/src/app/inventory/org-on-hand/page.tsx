"use client";

import { inventoryApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { OrgOnHandLineDto } from "@drug-store/shared";
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import { useEffect, useState } from "react";

export default function OrgOnHandPage() {
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [items, setItems] = useState<OrgOnHandLineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHqUser) {
      setLoading(false);
      setItems([]);
      return;
    }
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await inventoryApi.getOrgOnHand();
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load org on-hand");
      } finally {
        setLoading(false);
      }
    })();
  }, [isHqUser]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Org-wide on-hand</h1>
        <p className="mt-1 text-sm text-gray-500">
          Read-only inventory across branches for sourcing decisions.
        </p>
      </div>

      {!isHqUser && (
        <Alert variant="destructive">
          Only HQ roles can view organization-wide inventory. Switch to an HQ role to continue.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Branch inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading inventory…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">No inventory data available.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
              <table className="w-full text-left text-sm text-on_surface_variant">
                <thead className="sticky top-0 z-10 bg-surface_container_lowest">
                  <tr>
                    <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                      Branch
                    </th>
                    <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                      Medicine
                    </th>
                    <th className="px-4 py-4 text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on_surface_variant">
                      On-hand qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={`${item.branchId}-${item.medicineId}`}
                      className="hover:bg-surface_container_high"
                    >
                      <td className="px-4 py-4 text-on_surface">{item.branchName}</td>
                      <td className="px-4 py-4 text-on_surface">{item.medicineName}</td>
                      <td className="px-4 py-4 text-on_surface_variant">{item.quantityOnHand}</td>
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
