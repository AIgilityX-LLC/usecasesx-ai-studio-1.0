/**
 * Platform administrators — create, disable, rotate, assign.
 *
 * Only `super_admin` may open this surface, and every action re-verifies that
 * role on the server. Passwords are validated against the platform policy
 * before they leave the browser so the operator sees the exact failing rule.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertCircle, KeyRound, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import {
  PLATFORM_PASSWORD_MAX_AGE_DAYS,
  PLATFORM_PASSWORD_MIN_LENGTH,
  generatePlatformPassword,
  validatePlatformPassword,
} from "@/lib/admin/password-policy";
import {
  assignPlatformAdminOrganizationFn,
  createPlatformAdminFn,
  listPlatformAdminsFn,
  resetPlatformAdminPasswordFn,
  setPlatformAdminDisabledFn,
  updatePlatformAdminRolesFn,
} from "@/lib/admin/platform-users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PlatformRole = "super_admin" | "admin";

export const Route = createFileRoute("/_app/platform-admin/platform-admins")({
  head: () => privateHead("Platform administrators"),
  component: () => (
    <RequireRoles anyOf={["super_admin"]} action="manage platform administrators">
      <PlatformAdminsPage />
    </RequireRoles>
  ),
});

const NO_ORG = "__none__";

function PlatformAdminsPage() {
  const queryClient = useQueryClient();
  const listAdmins = useServerFn(listPlatformAdminsFn);
  const createAdmin = useServerFn(createPlatformAdminFn);
  const setDisabled = useServerFn(setPlatformAdminDisabledFn);
  const resetPassword = useServerFn(resetPlatformAdminPasswordFn);
  const updateRoles = useServerFn(updatePlatformAdminRolesFn);
  const assignOrg = useServerFn(assignPlatformAdminOrganizationFn);

  const admins = useQuery({
    queryKey: ["platform-admins"],
    queryFn: () => listAdmins(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform-admins"] });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<PlatformRole[]>(["admin"]);
  const [organizationId, setOrganizationId] = useState<string>(NO_ORG);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState("");

  const policy = useMemo(() => validatePlatformPassword(password, { email }), [password, email]);
  const resetPolicy = useMemo(() => validatePlatformPassword(resetValue), [resetValue]);

  const create = useMutation({
    mutationFn: () =>
      createAdmin({
        data: {
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          password,
          roles,
          organizationId: organizationId === NO_ORG ? null : organizationId,
        },
      }),
    onSuccess: (result) => {
      toast.success(result.created ? "Administrator created" : "Administrator re-provisioned", {
        description: "Share the password over a secure channel and require a rotation.",
      });
      setEmail("");
      setFullName("");
      setPassword("");
      setRoles(["admin"]);
      setOrganizationId(NO_ORG);
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not save the administrator", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const disable = useMutation({
    mutationFn: (vars: { userId: string; disabled: boolean }) => setDisabled({ data: vars }),
    onSuccess: (result) => {
      toast.success(result.disabled ? "Account disabled" : "Account re-enabled");
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not change the account state", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const rotate = useMutation({
    mutationFn: (vars: { userId: string; email: string; password: string }) =>
      resetPassword({ data: vars }),
    onSuccess: () => {
      toast.success("Password rotated", { description: "The rotation clock has been reset." });
      setResetFor(null);
      setResetValue("");
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not rotate the password", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const changeRoles = useMutation({
    mutationFn: (vars: { userId: string; roles: PlatformRole[] }) => updateRoles({ data: vars }),
    onSuccess: () => {
      toast.success("Roles updated");
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not update roles", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const changeOrg = useMutation({
    mutationFn: (vars: { userId: string; organizationId: string | null }) =>
      assignOrg({ data: vars }),
    onSuccess: () => {
      toast.success("Organisation assigned");
      void invalidate();
    },
    onError: (error: unknown) =>
      toast.error("Could not assign the organisation", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  if (admins.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (admins.error || !admins.data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>Administrators unavailable</AlertTitle>
          <AlertDescription>
            {admins.error instanceof Error
              ? admins.error.message
              : "This account is not allowed to read platform administrators."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { accounts, organizations, viewerId } = admins.data;
  const nameValid = fullName.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Platform administrators</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Accounts holding global publishing and role-granting power. Passwords must meet the
            platform policy and rotate every {PLATFORM_PASSWORD_MAX_AGE_DAYS} days.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void admins.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" aria-hidden />
            Create or re-provision an administrator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pa-email">Work email</Label>
              <Input
                id="pa-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organisation.com"
              />
              {email && !emailValid ? (
                <p className="text-xs text-destructive">
                  That email address is not formatted correctly.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pa-name">Full name</Label>
              <Input
                id="pa-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Given name Family name"
              />
              {fullName && !nameValid ? (
                <p className="text-xs text-destructive">Enter at least two characters.</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pa-password">Initial password</Label>
              <div className="flex gap-2">
                <Input
                  id="pa-password"
                  type="text"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`${PLATFORM_PASSWORD_MIN_LENGTH}+ characters`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePlatformPassword())}
                >
                  Generate
                </Button>
              </div>
              {password ? (
                <ul className="space-y-1 pt-1 text-xs">
                  {policy.checks.map((check) => (
                    <li
                      key={check.id}
                      className={check.ok ? "text-primary" : "text-muted-foreground"}
                    >
                      {check.ok ? "✓" : "•"} {check.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-4">
                  {(["super_admin", "admin"] as PlatformRole[]).map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={roles.includes(role)}
                        onCheckedChange={(checked) =>
                          setRoles((current) =>
                            checked === true
                              ? [...new Set([...current, role])]
                              : current.filter((r) => r !== role),
                          )
                        }
                      />
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{role}</code>
                    </label>
                  ))}
                </div>
                {roles.length === 0 ? (
                  <p className="text-xs text-destructive">Select at least one role.</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pa-org">Organisation</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger id="pa-org">
                    <SelectValue placeholder="No organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ORG}>No organisation</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                        {org.isDemo ? " (demo)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            disabled={
              !policy.ok || !nameValid || !emailValid || roles.length === 0 || create.isPending
            }
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Saving…" : "Save administrator"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {accounts.length} administrator account(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No platform administrators exist yet. Create the first one above.
            </p>
          ) : null}
          {accounts.map((account) => (
            <div key={account.id} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{account.fullName ?? account.email}</p>
                  <p className="text-sm text-muted-foreground">{account.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.rotation.label} · last sign-in{" "}
                    {account.lastSignInAt
                      ? new Date(account.lastSignInAt).toLocaleString()
                      : "never"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {account.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                  {account.disabled ? (
                    <Badge variant="destructive">Disabled</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                  {account.rotation.status === "overdue" ? (
                    <Badge variant="destructive">Rotation overdue</Badge>
                  ) : null}
                  {account.rotation.status === "due-soon" ? (
                    <Badge variant="secondary">Rotation due</Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["super_admin", "admin"] as PlatformRole[]).map((role) => (
                  <label key={role} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={account.roles.includes(role)}
                      disabled={changeRoles.isPending}
                      onCheckedChange={(checked) => {
                        const next =
                          checked === true
                            ? ([...new Set([...account.roles, role])] as PlatformRole[])
                            : (account.roles.filter((r) => r !== role) as PlatformRole[]);
                        if (next.length === 0) {
                          toast.error("Keep at least one platform role", {
                            description: "Disable the account instead of removing every role.",
                          });
                          return;
                        }
                        changeRoles.mutate({ userId: account.id, roles: next });
                      }}
                    />
                    {role}
                  </label>
                ))}
                <Select
                  value={account.organizationId ?? NO_ORG}
                  onValueChange={(value) =>
                    changeOrg.mutate({
                      userId: account.id,
                      organizationId: value === NO_ORG ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="w-56" aria-label={`Organisation for ${account.email}`}>
                    <SelectValue placeholder="No organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ORG}>No organisation</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResetFor(resetFor === account.id ? null : account.id);
                    setResetValue("");
                  }}
                >
                  <KeyRound className="mr-2 h-4 w-4" aria-hidden />
                  {resetFor === account.id ? "Cancel reset" : "Reset password"}
                </Button>
                <Button
                  size="sm"
                  variant={account.disabled ? "outline" : "destructive"}
                  disabled={disable.isPending || (!account.disabled && account.id === viewerId)}
                  onClick={() =>
                    disable.mutate({ userId: account.id, disabled: !account.disabled })
                  }
                >
                  {account.disabled ? "Re-enable" : "Disable"}
                </Button>
              </div>

              {resetFor === account.id ? (
                <div className="space-y-2 rounded-md border border-border bg-secondary/40 p-3">
                  <Label htmlFor={`reset-${account.id}`}>New password</Label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id={`reset-${account.id}`}
                      className="max-w-xs"
                      value={resetValue}
                      onChange={(e) => setResetValue(e.target.value)}
                      placeholder={`${PLATFORM_PASSWORD_MIN_LENGTH}+ characters`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setResetValue(generatePlatformPassword())}
                    >
                      Generate
                    </Button>
                    <Button
                      disabled={!resetPolicy.ok || rotate.isPending}
                      onClick={() =>
                        rotate.mutate({
                          userId: account.id,
                          email: account.email,
                          password: resetValue,
                        })
                      }
                    >
                      {rotate.isPending ? "Rotating…" : "Rotate password"}
                    </Button>
                  </div>
                  {resetValue && !resetPolicy.ok ? (
                    <ul className="space-y-1 text-xs text-destructive">
                      {resetPolicy.errors.map((error) => (
                        <li key={error}>• {error}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
