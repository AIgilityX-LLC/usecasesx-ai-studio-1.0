import { useState } from "react";
import { Crown, ShieldCheck, Sparkles } from "lucide-react";
import { useEntitlement } from "@/hooks/useEntitlement";
import { FOUNDING_UNTIL_LABEL } from "@/lib/entitlements";
import { FoundingAccessRequestModal } from "@/components/FoundingAccessRequestModal";

/**
 * Surfaces Founding / Pro entitlement status. Does NOT auto-grant Pro —
 * ineligible or lite users request access via the review modal.
 */
export function FoundingAccessBanner({ sourcePage = "/pricing" }: { sourcePage?: string }) {
  const ent = useEntitlement();
  const [requestOpen, setRequestOpen] = useState(false);

  const alreadyPro = ent.tier === "pro" || ent.tier === "enterprise";

  if (!ent.isAuthed) return null;
  if (ent.loading) return null;

  if (alreadyPro) {
    const days = ent.daysRemaining;
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold text-foreground">
              {ent.isFounding
                ? "Founding Member — Pro access active"
                : `${ent.tier === "enterprise" ? "Enterprise" : "Pro"} access active`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ent.expiresAt ? (
                <>
                  Gratis until{" "}
                  <span className="font-semibold text-foreground">{FOUNDING_UNTIL_LABEL}</span>
                  {days != null && days > 0
                    ? ` — ${days} day${days === 1 ? "" : "s"} remaining.`
                    : "."}
                </>
              ) : (
                "Full Pro feature set unlocked across all UseCasesX™ modules."
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-foreground">Request Early Gratis (Pro) Access</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pro Founding Access is complimentary through {FOUNDING_UNTIL_LABEL} after our team
                reviews your request. You will receive a secure invite link by email — no password
                is sent, and access is not granted automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            <Crown className="h-4 w-4" /> Request access
          </button>
        </div>
      </div>
      <FoundingAccessRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </>
  );
}
