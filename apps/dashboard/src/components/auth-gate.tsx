"use client";

import { tenantsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { state } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isChooseTenantRoute = pathname === "/choose-tenant";

  useEffect(() => {
    if (!state.accessToken) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }

    if (isAuthRoute || isChooseTenantRoute) {
      return;
    }

    void tenantsApi
      .listTenants()
      .then((tenants) => {
        if (!tenants.length) {
          return;
        }
        if (!state.tenantId || !tenants.some((tenant) => tenant.id === state.tenantId)) {
          router.replace(`/choose-tenant?next=${encodeURIComponent(pathname || "/")}`);
        }
      })
      .catch(() => {});
  }, [isAuthRoute, isChooseTenantRoute, pathname, router, state.accessToken, state.tenantId]);

  if (!state.accessToken) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-surface">
        <p className="text-sm text-on_surface_variant">Signing in…</p>
      </div>
    );
  }

  return <>{children}</>;
}
