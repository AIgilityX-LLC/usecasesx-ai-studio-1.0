import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, CalendarClock, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useEntitlement } from "@/hooks/useEntitlement";
import { FOUNDING_UNTIL_LABEL, isEligibleEmail, type EntTier } from "@/lib/entitlements";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  feature: string;
  requiredTier?: Exclude<EntTier, "lite">;
  description?: string;
  className?: string;
  sourcePage?: string;
};

/**
 * Lock screen shown when a user's tier can't unlock a feature. Clearly explains
 * the expiration state (if founding access lapsed) and offers a path back:
 * upgrade, or rejoin the Free Pro waitlist when no longer eligible.
 */
export function EntitlementLockCard({
  feature,
  requiredTier = "pro",
  description,
  className,
  sourcePage = "/sarpi",
}: Props) {
  const ent = useEntitlement();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });
    return () => { active = false; };
  }, []);

  const tierName = requiredTier === "enterprise" ? "Enterprise" : "Pro";
  const eligible = email ? isEligibleEmail(email) : true;

  return (
    <>
      <Card className={`border-dashed bg-gradient-to-br from-primary/5 to-transparent ${className ?? ""}`}>
        <CardContent className="flex flex-col gap-4 py-6">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/15 p-2 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{feature}</h3>
                <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" /> {tierName}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {description ?? `Upgrade to ${tierName} to unlock ${feature}.`}
              </p>
            </div>
          </div>

          {/* Expiration context */}
          {ent.expired && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-muted-foreground">
                Your founding-member access
                {ent.expiresAt ? <> expired on <span className="font-semibold text-foreground">{ent.expiresAt.toLocaleDateString()}</span></> : " has expired"}
                {" "}and your plan reverted to <span className="font-semibold text-foreground">Lite</span>.
              </p>
            </div>
          )}
          {!ent.expired && ent.expiresAt && ent.daysRemaining != null && ent.daysRemaining > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-3 text-sm">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground">
                Gratis access is active until <span className="font-semibold text-foreground">{FOUNDING_UNTIL_LABEL}</span> — {ent.daysRemaining} day{ent.daysRemaining === 1 ? "" : "s"} remaining.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/pricing">Upgrade to {tierName}</Link>
            </Button>
            {email && !eligible && (
              <Button variant="outline" onClick={() => setWaitlistOpen(true)}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Rejoin the Free Pro waitlist
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <LeadCaptureModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        triggerCase="founding-member"
        sourcePage={sourcePage}
      />
    </>
  );
}
