"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthGate } from "@/components/auth-gate";
import { CommandPalette } from "@/components/command-palette";
import { usePathname } from "next/navigation";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">{children}</div>
    );
  }

  return (
    <>
      <CommandPalette />
      <AuthGate>
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1 overflow-auto p-12 lg:p-16">{children}</main>
        </div>
      </AuthGate>
    </>
  );
}
