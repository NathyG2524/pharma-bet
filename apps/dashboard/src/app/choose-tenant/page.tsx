"use client";

import { branchesApi, sessionApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { BranchDto, SessionBootstrapDto, SessionTenantDto } from "@drug-store/shared";
import {
  autoSelectBranchId,
  branchIdsForTenant,
  needsBranchSelectionStep,
  rolesForTenant,
} from "@drug-store/shared";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Select } from "@drug-store/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type Step = "loading" | "tenant" | "branch" | "empty";

function ChooseTenantWizard() {
  const { state, updateState } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next")?.trim() || "/";
  const bootstrapLoaded = useRef(false);

  useEffect(() => {
    if (!state.accessToken) {
      bootstrapLoaded.current = false;
    }
  }, [state.accessToken]);

  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<SessionBootstrapDto | null>(null);
  const [branchList, setBranchList] = useState<BranchDto[]>([]);
  const [activeTenant, setActiveTenant] = useState<SessionTenantDto | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const finishAndNavigate = useCallback(
    (tenant: SessionTenantDto, bootstrapData: SessionBootstrapDto, activeBranch: string | null) => {
      updateState({
        tenantId: tenant.id,
        roles: rolesForTenant(tenant, bootstrapData.isPlatformAdmin),
        branchIds: branchIdsForTenant(tenant),
        activeBranchId: activeBranch,
        onboardingComplete: true,
      });
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    },
    [nextPath, router, updateState],
  );

  const prepareBranchStep = useCallback(
    async (tenant: SessionTenantDto, data: SessionBootstrapDto) => {
      updateState({
        tenantId: tenant.id,
        roles: rolesForTenant(tenant, data.isPlatformAdmin),
        branchIds: branchIdsForTenant(tenant),
        activeBranchId: null,
      });
      setActiveTenant(tenant);
      const branches = await branchesApi.listBranches();
      setBranchList(branches);
      const ids = tenant.memberships
        .map((m) => m.branchId)
        .filter((b): b is string => typeof b === "string" && b.length > 0);
      const unique = [...new Set(ids)];
      if (unique.length > 0) {
        setSelectedBranchId(unique[0] ?? "");
      }
      setStep("branch");
    },
    [updateState],
  );

  const applyTenant = useCallback(
    async (tenant: SessionTenantDto, data: SessionBootstrapDto) => {
      setError(null);
      const needBranch = needsBranchSelectionStep(tenant, data.isPlatformAdmin);
      const autoBranch = autoSelectBranchId(tenant, data.isPlatformAdmin);
      if (needBranch) {
        try {
          await prepareBranchStep(tenant, data);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load branches");
          setStep("tenant");
        }
        return;
      }
      finishAndNavigate(tenant, data, autoBranch);
    },
    [finishAndNavigate, prepareBranchStep],
  );

  useEffect(() => {
    if (!state.accessToken) {
      router.replace("/login");
    }
  }, [state.accessToken, router]);

  useEffect(() => {
    if (!state.accessToken || state.onboardingComplete || bootstrapLoaded.current) {
      return;
    }
    let cancelled = false;
    (async () => {
      setError(null);
      setStep("loading");
      try {
        const data = await sessionApi.getBootstrap();
        if (cancelled) return;
        bootstrapLoaded.current = true;
        setBootstrap(data);
        if (data.tenants.length === 0) {
          setStep("empty");
          return;
        }
        if (data.tenants.length === 1) {
          const only = data.tenants[0];
          if (!only) {
            setStep("empty");
            return;
          }
          const needBranch = needsBranchSelectionStep(only, data.isPlatformAdmin);
          const autoBranch = autoSelectBranchId(only, data.isPlatformAdmin);
          if (needBranch) {
            try {
              await prepareBranchStep(only, data);
            } catch (err) {
              if (!cancelled) {
                setError(err instanceof Error ? err.message : "Failed to load branches");
                setStep("tenant");
              }
            }
            return;
          }
          finishAndNavigate(only, data, autoBranch);
          return;
        }
        setStep("tenant");
      } catch (err) {
        if (!cancelled) {
          bootstrapLoaded.current = false;
          setError(err instanceof Error ? err.message : "Could not load organizations");
          setStep("tenant");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.accessToken, state.onboardingComplete, finishAndNavigate, prepareBranchStep]);

  if (!state.accessToken) {
    return (
      <p className="text-sm text-on_surface_variant" aria-live="polite">
        Redirecting…
      </p>
    );
  }

  if (state.onboardingComplete) {
    router.replace(nextPath.startsWith("/") ? nextPath : "/");
    return (
      <p className="text-sm text-on_surface_variant" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (step === "loading") {
    return (
      <p className="text-sm text-on_surface_variant" aria-live="polite">
        Loading organizations…
      </p>
    );
  }

  if (step === "empty") {
    return (
      <Card className="w-full max-w-md border border-outline_variant/15 shadow-tonal">
        <CardHeader>
          <CardTitle>No organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-on_surface_variant">
          <p>
            Your account is not linked to any tenant yet. Contact an administrator for an invite.
          </p>
          <Button type="button" variant="secondary" onClick={() => router.replace("/login")}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "branch" && activeTenant && bootstrap) {
    const ids = activeTenant.memberships
      .map((m) => m.branchId)
      .filter((b): b is string => typeof b === "string" && b.length > 0);
    const unique = [...new Set(ids)];
    const nameById = new Map(branchList.map((b) => [b.id, b.name]));

    return (
      <Card className="w-full max-w-lg border border-outline_variant/15 shadow-tonal">
        <CardHeader>
          <CardTitle>Choose branch</CardTitle>
          <p className="text-sm font-normal text-on_surface_variant">
            You have access to multiple branches in {activeTenant.name}. Pick where you are working
            now.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div className="space-y-2">
            <label htmlFor="branch-choice" className="text-sm font-medium text-on_surface">
              Branch
            </label>
            <Select
              id="branch-choice"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              {unique.map((id) => (
                <option key={id} value={id}>
                  {nameById.get(id) ?? id}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!selectedBranchId}
            onClick={() => finishAndNavigate(activeTenant, bootstrap, selectedBranchId)}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "tenant" && bootstrap && bootstrap.tenants.length > 1) {
    return (
      <Card className="w-full max-w-lg border border-outline_variant/15 shadow-tonal">
        <CardHeader>
          <CardTitle>Choose organization</CardTitle>
          <p className="text-sm font-normal text-on_surface_variant">
            Select which organization you want to use for this session.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <ul className="space-y-2">
            {bootstrap.tenants.map((tenant) => (
              <li key={tenant.id}>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto w-full justify-between py-3 text-left"
                  onClick={() => void applyTenant(tenant, bootstrap)}
                >
                  <span className="font-medium text-on_surface">{tenant.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <p className="text-sm text-on_surface_variant" aria-live="polite">
      Preparing…
    </p>
  );
}

export default function ChooseTenantPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-on_surface_variant" aria-live="polite">
          Loading…
        </p>
      }
    >
      <ChooseTenantWizard />
    </Suspense>
  );
}
