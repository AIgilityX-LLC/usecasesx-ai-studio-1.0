import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Crown, MailWarning, ShieldCheck } from "lucide-react";
import { claimFoundingAccess, type ClaimResult } from "@/lib/founding.functions";
import { useEntitlement } from "@/hooks/useEntitlement";
import { FOUNDING_UNTIL_LABEL } from "@/lib/entitlements";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";

/**
 * Auto-runs the founding-member grant for a signed-in user and surfaces the
 * outcome. Eligible verified users get Pro gratis until 31 Dec 2026; everyone
 * else can join the Free Pro waitlist.
 */
export function FoundingAccessBanner({ sourcePage = "/pricing" }: { sourcePage?: string }) {
  const ent = useEntitlement();
  const claim = useServerFn(claimFoundingAccess);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const attempted = useRef(false);

  const alreadyPro = ent.tier === "pro" || ent.tier === "enterprise";

  useEffect(() => {
    if (ent.loading || !ent.isAuthed || attempted.current) return;
    // Skip the grant if the user is already entitled to Pro or better.
    if (alreadyPro) return;
    attempted.current = true;
    (async () => {
      try {
        const r = await claim();
        setResult(r as ClaimResult);
        if (r.status === "granted" || r.status === "already") ent.refresh();
      } catch {
        /* silent — banner just won't upgrade its message */
      }
    })();
  }, [ent.loading, ent.isAuthed, alreadyPro]);

  if (!ent.isAuthed) return null;
  if (ent.loading) return null;

  // Active founding / Pro entitlement.
  if (alreadyPro || result?.status === "granted" || result?.status === "already") {
    const days = ent.daysRemaining;
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold text-foreground">
              {ent.isFounding ? "Founding Member — Pro access active" : `${ent.tier === "enterprise" ? "Enterprise" : "Pro"} access active`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ent.expiresAt
                ? <>Gratis until <span className="font-semibold text-foreground">{FOUNDING_UNTIL_LABEL}</span>{days != null && days > 0 ? ` — ${days} day${days === 1 ? "" : "s"} remaining.` : "."}</>
                : "Full Pro feature set unlocked across all UseCasesX™ modules."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but email not verified yet.
  if (result?.status === "unverified") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex items-start gap-3">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-bold text-foreground">Verify your email to unlock founding Pro</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a confirmation link to your inbox. Once verified, sign back in and your
              founding-member Pro access (gratis until {FOUNDING_UNTIL_LABEL}) is granted automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Verified but not auto-eligible (consumer email) → Free Pro waitlist.
  return (
    <>
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-foreground">Join the Free Pro waitlist</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your account isn't auto-eligible for instant founding access, but you can request
                Free Pro (gratis until {FOUNDING_UNTIL_LABEL}). We'll confirm your early-access spot.
              </p>
            </div>
          </div>
          <button
            onClick={() => setWaitlistOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            <Crown className="h-4 w-4" /> Join waitlist
          </button>
        </div>
      </div>
      <LeadCaptureModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        triggerCase="founding-member"
        sourcePage={sourcePage}
      />
    </>
  );
}
