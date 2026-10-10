import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useNavCapabilities } from "@/hooks/useNavCapabilities";
import type { NavCapability } from "@/lib/authz/nav-capabilities";

/**
 * Route-level capability gate aligned with sidebar visibility.
 * Does not replace RequireRoles / RequirePlan / RLS — adds the same
 * capability check the nav uses so deep links cannot bypass a hidden menu.
 */
export function RequireCapability({
  capability,
  action,
  children,
  fallback,
}: {
  capability: NavCapability | readonly NavCapability[];
  action?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { loading, has, personas, ctx } = useNavCapabilities();
  const needed = Array.isArray(capability) ? capability : [capability];

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  if (!ctx.userId) {
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

  if (!has(capability)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 space-y-4" data-testid="access-denied">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You need one of these capabilities to {action ?? "continue"}:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{needed.join(", ")}</code>.
        </p>
        <p className="text-xs text-muted-foreground">
          Resolved personas: {personas.length ? personas.join(", ") : "none"}
        </p>
        <Button asChild variant="outline">
          <Link to="/">Back to UseCasesX</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
