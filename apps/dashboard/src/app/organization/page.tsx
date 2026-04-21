"use client";

import { branchesApi, tenantsApi } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import type { BranchDto, PendingHqInviteDto, TenantDto, UserRole } from "@drug-store/shared";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "@drug-store/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "platform_admin", label: "Platform admin" },
  { value: "hq_admin", label: "HQ admin" },
  { value: "hq_user", label: "HQ user" },
  { value: "branch_manager", label: "Branch manager" },
  { value: "branch_user", label: "Branch user" },
];

export default function OrganizationPage() {
  const { state, updateState } = useAuthContext();
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [hqAdminEmail, setHqAdminEmail] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [pendingHqInvites, setPendingHqInvites] = useState<PendingHqInviteDto[]>([]);
  const [latestHqInviteUrl, setLatestHqInviteUrl] = useState<string | null>(null);
  const [assignmentUserId, setAssignmentUserId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState<UserRole>("branch_user");
  const [assignmentBranchId, setAssignmentBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshTenants = useCallback(async () => {
    try {
      const data = await tenantsApi.listTenants();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    }
  }, []);

  const refreshBranches = useCallback(async () => {
    if (!state.tenantId) {
      setBranches([]);
      return;
    }
    try {
      const data = await branchesApi.listBranches();
      setBranches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches");
    }
  }, [state.tenantId]);

  const refreshPendingHqInvites = useCallback(async () => {
    try {
      const data = await tenantsApi.listPendingHqInvites();
      setPendingHqInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending HQ invites");
    }
  }, []);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  useEffect(() => {
    refreshPendingHqInvites();
  }, [refreshPendingHqInvites]);

  useEffect(() => {
    if (branches.length && !assignmentBranchId) {
      setAssignmentBranchId(branches[0].id);
    }
  }, [branches, assignmentBranchId]);

  const roleSelectValue = useMemo(() => state.roles[0] ?? "hq_admin", [state.roles]);
  const tenantNameById = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants],
  );

  const handleTenantCreate = async () => {
    setError(null);
    const trimmedName = tenantName.trim();
    const trimmedEmail = hqAdminEmail.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) return;
    setLoading(true);
    try {
      const created = await tenantsApi.createTenant({
        name: trimmedName,
        hqAdminEmail: trimmedEmail,
      });
      setTenantName("");
      setHqAdminEmail("");
      setLatestHqInviteUrl(created.invite.url);
      setTenants((prev) => [...prev, created.tenant].sort((a, b) => a.name.localeCompare(b.name)));
      setPendingHqInvites((prev) => [created.invite, ...prev]);
      window.dispatchEvent(new Event("tenants:refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePendingInvite = async (inviteId: string) => {
    setError(null);
    setLoading(true);
    try {
      const revoked = await tenantsApi.revokePendingHqInvite(inviteId);
      setPendingHqInvites((prev) => prev.filter((invite) => invite.id !== revoked.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLatestInviteLink = async () => {
    if (!latestHqInviteUrl) return;
    try {
      await navigator.clipboard.writeText(latestHqInviteUrl);
    } catch {
      setError("Failed to copy invite link");
    }
  };

  const handleBranchCreate = async () => {
    setError(null);
    if (!branchName.trim() || !state.tenantId) return;
    setLoading(true);
    try {
      const created = await branchesApi.createBranch({
        name: branchName.trim(),
        code: branchCode.trim() || undefined,
      });
      setBranchName("");
      setBranchCode("");
      setBranches((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      window.dispatchEvent(new Event("branches:refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMembership = async () => {
    setError(null);
    if (!assignmentUserId.trim()) return;
    setLoading(true);
    try {
      await branchesApi.assignMembership({
        userId: assignmentUserId.trim(),
        role: assignmentRole,
        branchId: assignmentRole.startsWith("branch_") ? assignmentBranchId || undefined : null,
      });
      setAssignmentUserId("");
      window.dispatchEvent(new Event("branches:refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign membership");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization setup</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage tenants, branches, and user access for the current organization.
        </p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Dev auth context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="dev-user-id"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                User ID
              </label>
              <Input
                id="dev-user-id"
                value={state.userId}
                onChange={(e) => updateState({ userId: e.target.value })}
                placeholder="dev-user"
              />
            </div>
            <div>
              <label
                htmlFor="dev-user-role"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Role
              </label>
              <Select
                id="dev-user-role"
                value={roleSelectValue}
                onChange={(e) => updateState({ roles: [e.target.value as UserRole] })}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="text-xs text-on_surface_variant">
            Tenant: {state.tenantId || "—"} · Active branch: {state.activeBranchId || "—"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provision tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[2fr_2fr_1fr]">
            <div>
              <label
                htmlFor="tenant-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Tenant name
              </label>
              <Input
                id="tenant-name"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="New tenant name"
              />
            </div>
            <div>
              <label
                htmlFor="hq-admin-email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                First HQ admin email
              </label>
              <Input
                id="hq-admin-email"
                type="email"
                value={hqAdminEmail}
                onChange={(e) => setHqAdminEmail(e.target.value)}
                placeholder="hq.admin@example.com"
              />
            </div>
            <Button type="button" onClick={handleTenantCreate} disabled={loading}>
              Create tenant
            </Button>
          </div>
          {latestHqInviteUrl ? (
            <div className="rounded-lg border border-outline_variant/30 bg-surface_container_low px-3 py-2 text-xs text-on_surface_variant">
              Latest HQ invite link:{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => void handleCopyLatestInviteLink()}
              >
                Copy link
              </button>
            </div>
          ) : null}
          {tenants.length > 0 && (
            <div className="text-xs text-on_surface_variant">
              {tenants.length} tenant(s) available
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending HQ admin invites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
            <table className="w-full text-left text-sm text-on_surface_variant">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingHqInvites.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-on_surface_variant">
                      No pending HQ invites.
                    </td>
                  </tr>
                ) : (
                  pendingHqInvites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-surface_container_high">
                      <td className="px-4 py-3 text-on_surface">{invite.email}</td>
                      <td className="px-4 py-3">
                        {tenantNameById.get(invite.tenantId) ?? invite.tenantId}
                      </td>
                      <td className="px-4 py-3">{new Date(invite.expiresAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          onClick={() => void handleRevokePendingInvite(invite.id)}
                          disabled={loading}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <label
                htmlFor="branch-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Branch name
              </label>
              <Input
                id="branch-name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch name"
                disabled={!state.tenantId}
              />
            </div>
            <div>
              <label
                htmlFor="branch-code"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Branch code
              </label>
              <Input
                id="branch-code"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="Code (optional)"
                disabled={!state.tenantId}
              />
            </div>
            <Button
              type="button"
              onClick={handleBranchCreate}
              disabled={loading || !state.tenantId}
            >
              Add branch
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg bg-surface_container_lowest">
            <table className="w-full text-left text-sm text-on_surface_variant">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Branch name
                  </th>
                  <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.05rem]">
                    Code
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-on_surface_variant">
                      {state.tenantId ? "No branches yet." : "Select a tenant to manage branches."}
                    </td>
                  </tr>
                ) : (
                  branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-surface_container_high">
                      <td className="px-4 py-3 font-medium text-on_surface">{branch.name}</td>
                      <td className="px-4 py-3">{branch.code ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign user to branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="assignment-user-id"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                User ID
              </label>
              <Input
                id="assignment-user-id"
                value={assignmentUserId}
                onChange={(e) => setAssignmentUserId(e.target.value)}
                placeholder="User ID"
                disabled={!state.tenantId}
              />
            </div>
            <div>
              <label
                htmlFor="assignment-role"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Role
              </label>
              <Select
                id="assignment-role"
                value={assignmentRole}
                onChange={(e) => setAssignmentRole(e.target.value as UserRole)}
                disabled={!state.tenantId}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="assignment-branch"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Branch
              </label>
              <Select
                id="assignment-branch"
                value={assignmentBranchId}
                onChange={(e) => setAssignmentBranchId(e.target.value)}
                disabled={!state.tenantId || !assignmentRole.startsWith("branch_")}
              >
                <option value="" disabled>
                  Select branch
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleAssignMembership}
            disabled={
              loading ||
              !state.tenantId ||
              (assignmentRole.startsWith("branch_") && !assignmentBranchId)
            }
          >
            Assign access
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
