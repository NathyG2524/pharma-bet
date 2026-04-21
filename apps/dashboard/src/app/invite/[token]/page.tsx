"use client";

import { invitesApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@drug-store/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { updateState } = useAuthContext();

  const [email, setEmail] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    invitesApi
      .lookupInvite(token)
      .then((invite) => setEmail(invite.email))
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Invalid or expired invite link");
      });
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match");
      return;
    }
    setSubmitError(null);
    setLoading(true);
    try {
      const res = await invitesApi.acceptInvite({ token, password });
      updateState({
        accessToken: res.accessToken,
        userId: res.user.id,
        email: res.user.email,
        tenantId: "",
        roles: [],
        branchIds: [],
        activeBranchId: null,
      });
      router.replace("/");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <Card className="w-full max-w-md border border-outline_variant/15 shadow-tonal">
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" title="Invite error">
            {loadError}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (email === null) {
    return (
      <p className="text-sm text-on_surface_variant" aria-live="polite">
        Loading invite…
      </p>
    );
  }

  return (
    <Card className="w-full max-w-md border border-outline_variant/15 shadow-tonal">
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <p className="text-sm text-on_surface_variant">
          You have been invited to join. Set a password to activate your account.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {submitError ? (
            <Alert variant="destructive" title="Could not accept invite">
              {submitError}
            </Alert>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium text-on_surface">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              readOnly
              disabled
              className="bg-surface_variant/30"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-password" className="text-sm font-medium text-on_surface">
              Password
            </label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-on_surface_variant">At least 8 characters.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-confirm" className="text-sm font-medium text-on_surface">
              Confirm password
            </label>
            <Input
              id="invite-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Activating…" : "Activate account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
