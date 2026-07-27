import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Clock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthz } from "@/hooks/useAuthz";
import { EDITION_LABEL, type EntitlementKey } from "@/lib/authz";

type Props = {
  entitlement: EntitlementKey;
  children: ReactNode;
  /** Render nothing/custom instead of the full locked panel. */
  fallback?: ReactNode;
  /** Set for inline affordances (buttons) rather than whole pages. */
  inline?: boolean;
};

/**
 * Declarative entitlement gate. UI-only: every protected action must also be
 * re-checked server-side (`assertEntitled`) and by RLS.
 */
export function RequireEntitlement({
  entitlement,
  children,
  fallback,
  inline = false,
}: Props) {
  const authz = useAuthz();

  if (authz.loading) {
    return inline ? null : (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground"
      >
        Checking access…
      </div>
    );
  }

  const decision = authz.explain(entitlement);
  if (decision.allowed) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  if (inline) return null;

  const notAvailable = decision.reason === "not_available";
  const needsSignIn = decision.reason === "unauthenticated";
  const Icon = notAvailable ? Clock : needsSignIn ? LogIn : Lock;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {notAvailable
                ? "Not available yet"
                : `${EDITION_LABEL[decision.requiredEdition]} capability`}
            </div>
            <h1 className="mt-1 text-xl font-bold">
              {decision.definition.label}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {decision.message} {decision.definition.description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {needsSignIn ? (
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : notAvailable ? null : (
            <Button asChild>
              <Link to="/pricing">View editions</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/repository">Back to the repository</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
