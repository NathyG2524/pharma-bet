"use client";

import { PurchaseOrderForm } from "@/components/purchase-order-form";
import { branchesApi, medicinesApi, purchaseOrdersApi, suppliersApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type {
  BranchDto,
  CanonicalMedicineDto,
  PurchaseOrderDto,
  PurchaseOrderEventDto,
  PurchaseOrderStatus,
  SupplierDto,
} from "@drug-store/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from "@drug-store/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const statusLabels: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};

const statusVariants: Record<
  PurchaseOrderStatus,
  "default" | "success" | "warning" | "destructive"
> = {
  draft: "default",
  pending_approval: "warning",
  approved: "success",
  rejected: "destructive",
  changes_requested: "warning",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { state } = useAuthContext();
  const isHqUser = state.roles.some((role) =>
    ["hq_admin", "hq_user", "platform_admin"].includes(role),
  );
  const isBranchUser = state.roles.some((role) => ["branch_manager", "branch_user"].includes(role));
  const [po, setPo] = useState<PurchaseOrderDto | null>(null);
  const [events, setEvents] = useState<PurchaseOrderEventDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [medicines, setMedicines] = useState<CanonicalMedicineDto[]>([]);
  const [decisionReason, setDecisionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const editable = isHqUser && po && ["draft", "changes_requested"].includes(po.status);
  const showApprovals = isBranchUser && po?.status === "pending_approval";

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [poRes, eventsRes] = await Promise.all([
        purchaseOrdersApi.getPurchaseOrder(id),
        purchaseOrdersApi.getPurchaseOrderEvents(id),
      ]);
      setPo(poRes);
      setEvents(eventsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSupporting = useCallback(async () => {
    if (!editable) return;
    try {
      const [supplierData, branchData, medicineData] = await Promise.all([
        suppliersApi.listSuppliers(),
        branchesApi.listBranches(),
        medicinesApi.listCanonicalMedicines({ limit: 200, offset: 0 }),
      ]);
      setSuppliers(supplierData);
      setBranches(branchData);
      setMedicines(medicineData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplier data");
    }
  }, [editable]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadSupporting();
  }, [loadSupporting]);

  const handleSave = async (payload: {
    supplierId: string;
    branchId: string;
    notes?: string;
    lines: { medicineId: string; quantity: number; unitCost?: string }[];
  }) => {
    if (!id) return;
    const updated = await purchaseOrdersApi.updatePurchaseOrder(id, payload);
    setPo(updated);
    await load();
  };

  const handleSubmit = async (payload: {
    supplierId: string;
    branchId: string;
    notes?: string;
    lines: { medicineId: string; quantity: number; unitCost?: string }[];
  }) => {
    if (!id) return;
    await purchaseOrdersApi.updatePurchaseOrder(id, payload);
    const submitted = await purchaseOrdersApi.submitPurchaseOrder(id);
    setPo(submitted);
    await load();
  };

  const handleApprove = async () => {
    if (!id) return;
    setError(null);
    try {
      const updated = await purchaseOrdersApi.approvePurchaseOrder(id);
      setPo(updated);
      await load();
      router.push("/purchase-orders/approvals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve purchase order");
    }
  };

  const handleReject = async (action: "reject" | "request-changes") => {
    if (!id) return;
    if (!decisionReason.trim()) {
      setError("Provide a reason before rejecting or requesting changes.");
      return;
    }
    setError(null);
    try {
      const updated =
        action === "reject"
          ? await purchaseOrdersApi.rejectPurchaseOrder(id, { reason: decisionReason.trim() })
          : await purchaseOrdersApi.requestPurchaseOrderChanges(id, {
              reason: decisionReason.trim(),
            });
      setPo(updated);
      setDecisionReason("");
      await load();
      router.push("/purchase-orders/approvals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update purchase order");
    }
  };

  const lastEvent = useMemo(() => events[events.length - 1], [events]);

  if (loading && !po) {
    return <p className="text-sm text-gray-500">Loading purchase order…</p>;
  }

  if (!po) {
    return (
      <div className="max-w-xl">
        <Alert variant="destructive">{error ?? "Purchase order not found."}</Alert>
        <Link href="/purchase-orders" className="text-sm text-primary underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase order</h1>
          <p className="mt-1 text-sm text-gray-500">PO {po.id}</p>
        </div>
        <Badge variant={statusVariants[po.status]}>{statusLabels[po.status]}</Badge>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {po.status === "changes_requested" && lastEvent?.reason && (
        <Alert variant="warning">
          <strong>Changes requested:</strong> {lastEvent.reason}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">Supplier</p>
            <p className="font-medium text-on_surface">{po.supplier?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">Branch</p>
            <p className="font-medium text-on_surface">{po.branch?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">Created</p>
            <p className="text-sm text-on_surface">{new Date(po.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.05rem] text-on_surface_variant">Updated</p>
            <p className="text-sm text-on_surface">{new Date(po.updatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {editable && (
        <Card>
          <CardHeader>
            <CardTitle>Edit order</CardTitle>
          </CardHeader>
          <CardContent>
            <PurchaseOrderForm
              suppliers={suppliers}
              branches={branches}
              medicines={medicines}
              initialValues={{
                supplierId: po.supplierId,
                branchId: po.branchId,
                notes: po.notes,
                lines: po.lines?.map((line) => ({
                  medicineId: line.medicineId,
                  quantity: line.quantity,
                  unitCost: line.unitCost ?? undefined,
                })),
              }}
              onSave={handleSave}
              onSubmit={handleSubmit}
              saveLabel="Update draft"
              submitLabel={po.status === "draft" ? "Submit for approval" : "Resubmit for approval"}
            />
          </CardContent>
        </Card>
      )}

      {!editable && (
        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {po.lines?.map((line) => (
                <div
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline_variant/20 bg-surface_container_lowest px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-on_surface">
                      {line.medicine?.name ?? line.medicineId}
                    </p>
                    <p className="text-xs text-on_surface_variant">
                      Qty {line.quantity} · Unit cost {line.unitCost ?? "—"}
                    </p>
                  </div>
                </div>
              ))}
              {!po.lines?.length && <p className="text-sm text-gray-500">No line items.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {showApprovals && (
        <Card>
          <CardHeader>
            <CardTitle>Branch approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Add a reason for rejection or requested changes"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleApprove}>
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleReject("request-changes")}
              >
                Request changes
              </Button>
              <Button type="button" variant="outline" onClick={() => handleReject("reject")}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Approval history</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">No events recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-outline_variant/20 bg-surface_container_lowest px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-on_surface">{event.action}</span>
                    <span className="text-xs text-on_surface_variant">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {event.reason && <p className="mt-2 text-sm text-on_surface">{event.reason}</p>}
                  <p className="mt-1 text-xs text-on_surface_variant">By {event.userId}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div>
        <Link href={isHqUser ? "/purchase-orders" : "/purchase-orders/approvals"}>
          <Button type="button" variant="outline">
            Back
          </Button>
        </Link>
      </div>
    </div>
  );
}
