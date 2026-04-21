"use client";

import { authApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@drug-store/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginForm() {
  const { state, updateState } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.accessToken) {
      const q = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
      router.replace(state.onboardingComplete === false ? `/choose-tenant${q}` : next);
    }
  }, [state.accessToken, state.onboardingComplete, next, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      updateState({
        accessToken: res.accessToken,
        userId: res.user.id,
        email: res.user.email,
        tenantId: "",
        roles: [],
        branchIds: [],
        activeBranchId: null,
        onboardingComplete: false,
      });
      const q = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
      router.replace(`/choose-tenant${q}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-outline_variant/15 shadow-tonal">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <p className="text-sm text-on_surface_variant">
          Use your work email and password to access the dashboard.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive" title="Could not sign in">
              {error}
            </Alert>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-medium text-on_surface">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-medium text-on_surface">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          {(process.env.NODE_ENV !== "production" ||
            process.env.NEXT_PUBLIC_ENABLE_REGISTER === "true") && (
            <p className="text-center text-sm text-on_surface_variant">
              No account?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Register
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-on_surface_variant" aria-live="polite">
          Loading…
        </p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
