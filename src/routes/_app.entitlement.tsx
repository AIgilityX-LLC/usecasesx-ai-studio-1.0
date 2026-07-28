import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Check, Lock, CalendarClock, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEntitlement } from "@/hooks/useEntitlement";
import { FoundingAccessBanner } from "@/components/FoundingAccessBanner";
import { USECASEX_MODULES, tierUnlocks, tierLabel, FOUNDING_UNTIL_LABEL } from "@/lib/entitlements";

export const Route = createFileRoute("/_app/entitlement")({
  head: () => ({
    meta: [
      { title: "Your Plan & Entitlement — UseCasesX™" },
      {
        name: "description",
        content:
          "Review your current tier, gratis expiration date, and which UseCasesX modules are included or locked.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EntitlementPage,
});

function EntitlementPage() {
  const ent = useEntitlement();
  const label = tierLabel(ent.tier);

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Account · Plan & Entitlement"
        title="Your plan, access, and module entitlements"
        description="See exactly what your account unlocks today, when gratis founding access expires, and which UseCasesX™ modules are included or locked."
      />

      {!ent.isAuthed && !ent.loading && (
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-2xl px-6 py-16 space-y-4 text-center">
            <h2 className="text-xl font-semibold">Sign in to view your entitlement</h2>
            <p className="text-sm text-muted-foreground">
              Your tier and module access are tied to your account.
            </p>
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </section>
      )}

      {ent.isAuthed && !ent.loading && (
        <>
          {/* Status summary */}
          <section className="border-b border-border bg-background">
            <div className="mx-auto max-w-[1100px] px-6 py-12 grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Current tier</CardTitle>
                  {ent.isFounding ? (
                    <Crown className="h-4 w-4 text-primary" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">UseCasesX {label}</span>
                  </div>
                  {ent.isFounding && ent.tier !== "lite" && (
                    <Badge variant="secondary" className="mt-2 bg-primary/15 text-primary">
                      Founding Member
                    </Badge>
                  )}
                  {ent.expired && (
                    <Badge
                      variant="secondary"
                      className="mt-2 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    >
                      Reverted to Lite
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Gratis expiration</CardTitle>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {ent.expiresAt ? (
                    <>
                      <div className="text-2xl font-bold">{ent.expiresAt.toLocaleDateString()}</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ent.expired
                          ? "Access has expired."
                          : ent.daysRemaining != null
                            ? `${ent.daysRemaining} day${ent.daysRemaining === 1 ? "" : "s"} remaining`
                            : `Gratis until ${FOUNDING_UNTIL_LABEL}`}
                      </p>
                    </>
                  ) : (
                    <div className="text-lg font-semibold text-muted-foreground">No expiration</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Modules included</CardTitle>
                  <Sparkles className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {USECASEX_MODULES.filter((m) => tierUnlocks(ent.tier, m.required)).length}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}
                      / {USECASEX_MODULES.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">UseCasesX™ modules</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Founding / waitlist banner */}
          <section className="border-b border-border bg-secondary/40">
            <div className="mx-auto max-w-[1100px] px-6 py-8">
              <FoundingAccessBanner sourcePage="/entitlement" />
            </div>
          </section>

          {/* Module matrix */}
          <section className="bg-background">
            <div className="mx-auto max-w-[1100px] px-6 py-12">
              <h2 className="text-xl font-bold tracking-tight">Module access</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Included and locked UseCasesX modules for your current tier.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {USECASEX_MODULES.map((m) => {
                  const unlocked = tierUnlocks(ent.tier, m.required);
                  return (
                    <div
                      key={m.title}
                      className={`flex items-center justify-between gap-3 rounded-lg border border-border p-4 ${unlocked ? "bg-emerald-500/5" : "bg-muted/30 opacity-80"}`}
                    >
                      <div className="flex items-center gap-3">
                        {unlocked ? (
                          <Check className="h-5 w-5 shrink-0 text-emerald-500" />
                        ) : (
                          <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{m.title}</p>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Requires {tierLabel(m.required)}
                          </p>
                        </div>
                      </div>
                      {unlocked ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        >
                          Included
                        </Badge>
                      ) : (
                        <Link
                          to="/pricing"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Unlock <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
