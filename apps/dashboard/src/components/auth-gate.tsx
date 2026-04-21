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
    }
  }, [state.accessToken, pathname, router]);

  if (!state.accessToken) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-surface">
        <p className="text-sm text-on_surface_variant">Signing in…</p>
      </div>
    );
  }

  return <>{children}</>;
}
