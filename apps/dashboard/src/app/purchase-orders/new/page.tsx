"use client";

import { PurchaseOrderForm } from "@/components/purchase-order-form";
import { branchesApi, medicinesApi, purchaseOrdersApi, suppliersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type {
  BranchDto,
  CanonicalMedicineDto,
  CreatePurchaseOrderInput,
  SupplierDto,
} from "@drug-store/shared";
import { Alert, Card, CardContent, CardHeader, CardTitle } from "@drug-store/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function NewPurchaseOrderPage() {
  const { state } = useAuthContext();
  const router = useRouter();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [medicines, setMedicines] = useState<CanonicalMedicineDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isHqUser) return;
    setLoading(true);
    setError(null);
    try {
      const [supplierData, branchData, medicineData] = await Promise.all([
        suppliersApi.listSuppliers(),
        branchesApi.listBranches(),
        medicinesApi.listCanonicalMedicines({ limit: 200, offset: 0 }),
      ]);
      setSuppliers(supplierData.items);
      setBranches(branchData);
      setMedicines(medicineData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase order data");
    } finally {
      setLoading(false);
    }
  }, [isHqUser]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (payload: CreatePurchaseOrderInput) => {
    setError(null);
    const created = await purchaseOrdersApi.createPurchaseOrder(payload);
    router.push(`/purchase-orders/${created.id}`);
  };

  const handleSubmit = async (payload: CreatePurchaseOrderInput) => {
    setError(null);
    const created = await purchaseOrdersApi.createPurchaseOrder(payload);
    await purchaseOrdersApi.submitPurchaseOrder(created.id);
    router.push(`/purchase-orders/${created.id}`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New purchase order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Build a draft PO for a supplier and route it to the receiving branch.
        </p>
      </div>

      {!isHqUser && (
        <Alert variant="destructive">
          Only HQ users can create purchase orders. Switch to an HQ role to continue.
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>PO details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading supplier catalog…</p>
          ) : (
            <PurchaseOrderForm
              suppliers={suppliers}
              branches={branches}
              medicines={medicines}
              onSave={isHqUser ? handleSave : undefined}
              onSubmit={isHqUser ? handleSubmit : undefined}
              disabled={!isHqUser}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
