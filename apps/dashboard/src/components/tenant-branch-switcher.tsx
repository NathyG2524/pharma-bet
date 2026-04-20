"use client";

import { branchesApi, tenantsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { BranchDto, TenantDto } from "@drug-store/shared";
import { Alert, Button, Select } from "@drug-store/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export function TenantBranchSwitcher() {
  const { state, updateState } = useAuthContext();
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTenants = useCallback(async () => {
    setLoadingTenants(true);
    setError(null);
    try {
      const data = await tenantsApi.listTenants();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  const refreshBranches = useCallback(async () => {
    if (!state.tenantId) {
      setBranches([]);
      return;
    }
    setLoadingBranches(true);
    setError(null);
    try {
      const data = await branchesApi.listBranches();
      setBranches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches");
    } finally {
      setLoadingBranches(false);
    }
  }, [state.tenantId]);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  useEffect(() => {
    const handler = () => refreshTenants();
    window.addEventListener("tenants:refresh", handler);
    return () => window.removeEventListener("tenants:refresh", handler);
  }, [refreshTenants]);

  useEffect(() => {
    const handler = () => refreshBranches();
    window.addEventListener("branches:refresh", handler);
    return () => window.removeEventListener("branches:refresh", handler);
  }, [refreshBranches]);

  useEffect(() => {
    if (!state.tenantId && tenants.length > 0) {
      updateState({ tenantId: tenants[0].id, activeBranchId: null, branchIds: [] });
    }
  }, [tenants, state.tenantId, updateState]);

  useEffect(() => {
    const branchIds = branches.map((branch) => branch.id);
    const patch: { branchIds?: string[]; activeBranchId?: string | null } = {};
    if (!arraysEqual(branchIds, state.branchIds)) {
      patch.branchIds = branchIds;
    }
    const currentActiveBranchId = state.activeBranchId ?? null;
    let nextActiveBranchId = currentActiveBranchId;
    if (branchIds.length === 0) {
      nextActiveBranchId = null;
    } else if (!currentActiveBranchId || !branchIds.includes(currentActiveBranchId)) {
      nextActiveBranchId = branchIds[0];
    }
    if (nextActiveBranchId !== currentActiveBranchId) {
      patch.activeBranchId = nextActiveBranchId;
    }
    if (Object.keys(patch).length > 0) {
      updateState(patch);
    }
  }, [branches, state.branchIds, state.activeBranchId, updateState]);

  const tenantOptions = useMemo(
    () =>
      tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name}
        </option>
      )),
    [tenants],
  );

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      )),
    [branches],
  );

  return (
    <div className="rounded-lg bg-surface_container_lowest p-4 text-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-on_surface_variant">
          Tenant & Branch
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            refreshTenants();
            refreshBranches();
          }}
        >
          Refresh
        </Button>
      </div>
      {error && <Alert variant="destructive">{error}</Alert>}
      <div className="space-y-2">
        <label htmlFor="tenant-switcher" className="text-xs font-semibold text-on_surface_variant">
          Tenant
        </label>
        <Select
          id="tenant-switcher"
          value={state.tenantId}
          onChange={(e) =>
            updateState({ tenantId: e.target.value, activeBranchId: null, branchIds: [] })
          }
          disabled={loadingTenants}
        >
          <option value="" disabled>
            {loadingTenants ? "Loading tenants…" : "Select tenant"}
          </option>
          {tenantOptions}
        </Select>
      </div>
      <div className="space-y-2">
        <label htmlFor="branch-switcher" className="text-xs font-semibold text-on_surface_variant">
          Active branch
        </label>
        <Select
          id="branch-switcher"
          value={state.activeBranchId ?? ""}
          onChange={(e) => updateState({ activeBranchId: e.target.value })}
          disabled={loadingBranches || !state.tenantId}
        >
          <option value="" disabled>
            {state.tenantId
              ? loadingBranches
                ? "Loading branches…"
                : "Select branch"
              : "Pick a tenant"}
          </option>
          {branchOptions}
        </Select>
      </div>
    </div>
  );
}
