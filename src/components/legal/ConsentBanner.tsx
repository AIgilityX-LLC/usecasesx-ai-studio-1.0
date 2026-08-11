import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CONSENT_ACCEPT_ALL,
  CONSENT_CATEGORIES,
  CONSENT_ESSENTIAL_ONLY,
  CONSENT_POLICY_VERSION,
  isCurrentConsent,
  readStoredConsent,
  writeStoredConsent,
  type ConsentChoice,
} from "@/lib/legal/privacy.model";
import { recordConsentFn } from "@/lib/legal/privacy.functions";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_EVENT = "ucx:open-consent-preferences";

/** Opens the preferences centre from anywhere (footer link, account page). */
export function openConsentPreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function persist(choice: ConsentChoice, source: "banner" | "preferences_center") {
  writeStoredConsent(choice);
  // Only signed-in choices are stored server-side; anonymous choices stay local.
  void supabase.auth.getSession().then(({ data }) => {
    if (!data.session) return;
    void recordConsentFn({
      data: {
        analytics: choice.analytics,
        marketing: choice.marketing,
        policyVersion: choice.policyVersion,
        source,
      },
    }).catch(() => {
      /* consent must never block the UI */
    });
  });
}

/**
 * Cookie / analytics consent banner plus preferences centre.
 *
 * Strictly necessary processing is always on; analytics and marketing default
 * to off until the person chooses. Choices are stored locally straight away and
 * recorded against the account when signed in.
 */
export function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    setChoice(isCurrentConsent(stored) ? stored : null);
    setAnalytics(stored?.analytics ?? false);
    setMarketing(stored?.marketing ?? false);
  }, []);

  useEffect(() => {
    const open = () => setPrefsOpen(true);
    window.addEventListener(CONSENT_EVENT, open);
    return () => window.removeEventListener(CONSENT_EVENT, open);
  }, []);

  const decide = useCallback(
    (next: Omit<ConsentChoice, "decidedAt">, source: "banner" | "preferences_center") => {
      const full: ConsentChoice = { ...next, decidedAt: new Date().toISOString() };
      persist(full, source);
      setChoice(full);
      setAnalytics(full.analytics);
      setMarketing(full.marketing);
      setPrefsOpen(false);
    },
    [],
  );

  const showBanner = choice === null;

  return (
    <>
      {showBanner && (
        <div
          role="region"
          aria-label="Cookie and analytics consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur"
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-2.5">
              <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                We use strictly necessary cookies to run the product. Optional product analytics
                help us fix what is confusing, and marketing consent lets us follow up about
                editions and workshops. You choose.{" "}
                <Link to="/privacy" className="underline hover:text-foreground">
                  Privacy notice
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:shrink-0">
              <Button variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>
                Manage preferences
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => decide(CONSENT_ESSENTIAL_ONLY, "banner")}
              >
                Essential only
              </Button>
              <Button size="sm" onClick={() => decide(CONSENT_ACCEPT_ALL, "banner")}>
                Accept all
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cookie & analytics preferences</DialogTitle>
            <DialogDescription>
              Change these at any time. We record your choice, the policy version and the date so
              you can see what you agreed to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {CONSENT_CATEGORIES.map((category) => {
              const value =
                category.key === "analytics"
                  ? analytics
                  : category.key === "marketing"
                    ? marketing
                    : true;
              return (
                <div key={category.key} className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{category.label}</p>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <Switch
                    checked={value}
                    disabled={category.required}
                    aria-label={category.label}
                    onCheckedChange={(next) => {
                      if (category.key === "analytics") setAnalytics(next);
                      if (category.key === "marketing") setMarketing(next);
                    }}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => decide(CONSENT_ESSENTIAL_ONLY, "preferences_center")}
            >
              Essential only
            </Button>
            <Button
              onClick={() =>
                decide(
                  { analytics, marketing, policyVersion: CONSENT_POLICY_VERSION },
                  "preferences_center",
                )
              }
            >
              Save preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
