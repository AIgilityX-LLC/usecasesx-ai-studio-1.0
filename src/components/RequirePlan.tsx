import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { usePlan, type PlanTier } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";
import { signInHref } from "@/lib/auth-errors";

interface Props {
  /** Minimum plan tier required to view this surface. */
  min: PlanTier;
  /** Friendly feature label, e.g. "SARPI™ assessment". */
  feature?: string;
  children: ReactNode;
}

const TIER_RANK: Record<PlanTier, number> = { lite: 0, pro: 1, enterprise: 2 };

/**
 * Plan-tier gate. Admin/moderator users bypass plan checks. Lower-tier users
 * see an upgrade prompt instead of the protected content. Backend RLS is the
 * authoritative line of defense — this gate just keeps the UI honest.
 */
export function RequirePlan({ min, feature, children }: Props) {
  const plan = usePlan();

  if (plan.loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
        Verifying plan access…
      </div>
    );
  }

  if (plan.isAdmin) return <>{children}</>;

  // A signed-out visitor has no plan to upgrade — they need to sign in first.
  if (!plan.isAuthed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-primary/30 bg-card p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                Sign in required
              </div>
              <h1 className="text-xl font-bold">
                Sign in to open {feature ?? "this module"}
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Pro Founding Access is complimentary — create an account or sign in and you will come
            straight back here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href={signInHref()}>Sign in or register</a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/repository">Browse the repository</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (TIER_RANK[plan.tier] < TIER_RANK[min]) {

    const label = min === "enterprise" ? "Enterprise" : "Pro";
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-primary/30 bg-card p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                {label} feature
              </div>
              <h1 className="text-xl font-bold">
                {feature ?? "This module"} requires a {label} plan
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Your current plan is{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{plan.tier}</code>.
            Upgrade to unlock {feature ?? "this module"} inside the AIgilityX AI Use Case Studio™.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link to="/pricing">View plans</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/studio">Back to Studio</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
