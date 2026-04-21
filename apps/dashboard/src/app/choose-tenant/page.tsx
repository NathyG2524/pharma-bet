"use client";

import { branchesApi, tenantsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { BranchDto, TenantDto } from "@drug-store/shared";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Select } from "@drug-store/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function ChooseTenantPage() {
  const { state, updateState } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/";
  const safeNext = next.startsWith("/") ? next : "/";

  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(state.tenantId || "");
  const [selectedBranchId, setSelectedBranchId] = useState(state.activeBranchId ?? "");
  const [loading, setLoading] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.accessToken) {
      router.replace(`/login?next=${encodeURIComponent("/choose-tenant")}`);
    }
  }, [router, state.accessToken]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void tenantsApi
      .listTenants()
      .then((data) => {
        if (!active) return;
        setTenants(data);
        if (data.length === 1) {
          setSelectedTenantId(data[0].id);
        } else if (selectedTenantId && !data.some((tenant) => tenant.id === selectedTenantId)) {
          setSelectedTenantId("");
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load tenants");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTenantId]);

  useEffect(() => {
    if (!selectedTenantId) {
      setBranches([]);
      setSelectedBranchId("");
      return;
    }
    updateState({ tenantId: selectedTenantId, activeBranchId: null });
    let active = true;
    setLoadingBranches(true);
    setError(null);
    void branchesApi
      .listBranches()
      .then((data) => {
        if (!active) return;
        setBranches(data);
        if (data.length === 1) {
          setSelectedBranchId(data[0].id);
          return;
        }
        if (selectedBranchId && !data.some((branch) => branch.id === selectedBranchId)) {
          setSelectedBranchId("");
        }
      })
      .catch((err) => {
        if (!active) return;
        setBranches([]);
        setError(err instanceof Error ? err.message : "Failed to load branches");
      })
      .finally(() => {
        if (!active) return;
        setLoadingBranches(false);
      });
    return () => {
      active = false;
    };
  }, [selectedBranchId, selectedTenantId, updateState]);

  const canContinue = useMemo(() => {
    if (!selectedTenantId) return false;
    if (branches.length <= 1) return true;
    return Boolean(selectedBranchId);
  }, [branches.length, selectedBranchId, selectedTenantId]);

  const handleContinue = () => {
    if (!canContinue) return;
    updateState({
      tenantId: selectedTenantId,
      activeBranchId: selectedBranchId || null,
      branchIds: branches.map((branch) => branch.id),
    });
    router.replace(safeNext);
  };

  return (
    <Card className="w-full max-w-xl border border-outline_variant/15 shadow-tonal">
      <CardHeader>
        <CardTitle>Choose workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <Alert variant="destructive">{error}</Alert> : null}
        <div className="space-y-2">
          <label htmlFor="tenant-select" className="text-sm font-medium text-on_surface">
            Tenant
          </label>
          <Select
            id="tenant-select"
            value={selectedTenantId}
            onChange={(event) => setSelectedTenantId(event.target.value)}
            disabled={loading}
          >
            <option value="" disabled>
              {loading ? "Loading tenants…" : "Select tenant"}
            </option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </Select>
        </div>

        {selectedTenantId ? (
          <div className="space-y-2">
            <label htmlFor="branch-select" className="text-sm font-medium text-on_surface">
              Branch
            </label>
            <Select
              id="branch-select"
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              disabled={loadingBranches || branches.length <= 1}
            >
              <option value="" disabled>
                {loadingBranches
                  ? "Loading branches…"
                  : branches.length <= 1
                    ? "Auto-selected when only one branch is available"
                    : "Select branch"}
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <Button type="button" className="w-full" onClick={handleContinue} disabled={!canContinue}>
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
