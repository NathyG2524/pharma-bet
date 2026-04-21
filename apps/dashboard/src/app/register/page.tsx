"use client";

import { authApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@drug-store/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const allowRegisterUi =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_REGISTER === "true";

export default function RegisterPage() {
  const { state, updateState } = useAuthContext();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!allowRegisterUi) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (state.accessToken) {
      const q = "";
      router.replace(state.onboardingComplete === false ? `/choose-tenant${q}` : "/");
    }
  }, [state.accessToken, state.onboardingComplete, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowRegisterUi) return;
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register({ email, password });
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
      router.replace("/choose-tenant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!allowRegisterUi) {
    return (
      <p className="text-sm text-on_surface_variant" aria-live="polite">
        Redirecting…
      </p>
    );
  }

  return (
    <Card className="w-full max-w-md border border-outline_variant/15 shadow-tonal">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <p className="text-sm text-on_surface_variant">
          Register with your email. An administrator can invite you to an organization afterward.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <div className="space-y-2">
            <label htmlFor="register-email" className="text-sm font-medium text-on_surface">
              Email
            </label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="register-password" className="text-sm font-medium text-on_surface">
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-on_surface_variant">At least 8 characters.</p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-on_surface_variant">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
