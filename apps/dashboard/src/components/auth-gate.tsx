"use client";

import { useAuthContext } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { state } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!state.accessToken) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }
    if (state.onboardingComplete === false) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/choose-tenant${next}`);
    }
  }, [state.accessToken, state.onboardingComplete, pathname, router]);

  if (!state.accessToken) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-surface">
        <p className="text-sm text-on_surface_variant">Signing in…</p>
      </div>
    );
  }

  if (state.onboardingComplete === false) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-surface">
        <p className="text-sm text-on_surface_variant">Choose your organization…</p>
      </div>
    );
  }

  return <>{children}</>;
}
