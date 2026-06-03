import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useRoles, type AppRole } from "@/lib/usecasex.roles";
import { Button } from "@/components/ui/button";

interface Props {
  /** Any of these roles grants access. */
  anyOf: AppRole[];
  /** Friendly action label, e.g. "edit taxonomy". */
  action?: string;
  children: ReactNode;
  /** Optional fallback content for unauthorized state. */
  fallback?: ReactNode;
}

/**
 * Route-level role gate. Renders children only when the signed-in user has at
 * least one of the required roles. Otherwise renders a friendly access-denied
 * card. This is the single source of truth for permission UX across
 * UseCasesX™ admin and taxonomy surfaces — keep it aligned with the RLS
 * policies on user_roles / taxonomy_* / use_cases.
 */
export function RequireRoles({ anyOf, action, children, fallback }: Props) {
  const { loading, userId, roles, hasAny } = useRoles();

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 space-y-4">
        <h1 className="text-2xl font-semibold">Sign-in required</h1>
        <p className="text-sm text-muted-foreground">
          You need to be signed in to {action ?? "view this page"}.
        </p>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!hasAny(anyOf)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 space-y-4">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You need one of these roles to {action ?? "continue"}:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {anyOf.join(", ")}
          </code>
          .
        </p>
        <p className="text-xs text-muted-foreground">
          Current roles: {roles.length ? roles.join(", ") : "none"}
        </p>
        <Button asChild variant="outline">
          <Link to="/">Back to UseCasesX</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
