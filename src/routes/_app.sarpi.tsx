import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Gauge,
  TrendingUp,
  Activity,
  Target,
  ShieldCheck,
  Layers,
  Compass,
  PiggyBank,
  Search,
  Landmark,
  BarChart3,
  Crown,
  ArrowRight,
  Check,
} from "lucide-react";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { FoundingAccessBanner } from "@/components/FoundingAccessBanner";
import { EntitlementLockCard } from "@/components/EntitlementLockCard";
import { useEntitlement } from "@/hooks/useEntitlement";
import { tierUnlocks, type EntTier } from "@/lib/entitlements";
import { trackModuleEvent } from "@/lib/module-analytics";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/sarpi")({
  head: () => ({
    meta: [
      { title: "SARPI Suite™ — Measure AI Readiness, ROI, Risk & Value | UseCasesX™" },
      {
        name: "description",
        content:
          "SARPI Suite™: the executive AI value operating system. Measure AI readiness, ROI, risk, governance, and real business value. SARPI Pro gratis (free) until 31 Dec 2026.",
      },
      { property: "og:title", content: "SARPI Suite™ — The AI Value Operating System" },
      {
        property: "og:description",
        content:
          "Twelve connected modules. One executive view. Join SARPI Pro gratis (free) until 31 Dec 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SarpiFeaturesPage,
});

const FREE_UNTIL = "31 Dec 2026";

const MODULES = [
  { tier: "Lite", icon: Gauge, title: "AI Readiness Navigator™", desc: "Assess maturity across strategy, leadership, data, technology, skills, culture, governance, process, and change." },
  { tier: "Pro", icon: Layers, title: "Agentic AI Readiness Scorecard™", desc: "Pre-deployment readiness across use case, workflow, data, oversight, risk & control, integration, security, and ROI." },
  { tier: "Pro", icon: TrendingUp, title: "Agentic AI ROI Scorecard™", desc: "Expected and actual ROI across productivity, financial, operational, decision, risk, and human-AI dimensions." },
  { tier: "Lite", icon: PiggyBank, title: "AI Cost/ROI Navigator™", desc: "Estimate investment, productivity gains, cost savings, revenue impact, payback period, and ROI." },
  { tier: "Lite", icon: Activity, title: "AI Performance Index™", desc: "Measure adoption, productivity, quality, financial, strategic, and trust outcomes." },
  { tier: "Pro", icon: Search, title: "AI Value Gap Analyzer™", desc: "Identify gaps across strategy, data, skills, process, adoption, governance, measurement, and change." },
  { tier: "Pro", icon: Compass, title: "AI Investment Engine™", desc: "Prioritize by readiness, ROI potential, feasibility, strategic alignment, time to value, and risk confidence." },
  { tier: "Lite", icon: ShieldCheck, title: "Risk-Adjusted ROI Snapshot™", desc: "Apply lightweight risk signals to test whether projected ROI is realistic, responsible, and scalable." },
  { tier: "Pro", icon: Landmark, title: "Sovereign AI Maturity Snapshot™", desc: "Powered by the AIgilityX Sovereign AI 11-Layer Control Framework™." },
  { tier: "Enterprise", icon: ShieldCheck, title: "SERT™ Value Confidence Layer", desc: "Safe, Ethical, Responsible, Trustworthy — confidence layer testing whether projected AI value can scale." },
  { tier: "Enterprise", icon: Target, title: "AI Impact & Value Realization Engine™", desc: "Measure realized value across financial, operational, workforce, customer, decision, and sovereign dimensions." },
  { tier: "Enterprise", icon: BarChart3, title: "AI Portfolio & Board Value Center™", desc: "Monitor every AI initiative — health, ROI, benefits, risk, and board-ready executive reporting." },
] as const;

const FREE_TOOLS = [
  { title: "AI Readiness Checker", q: "Are you ready to adopt and scale AI?", points: ["AI Readiness Score", "Maturity level", "Top 3 readiness gaps", "Improvement guidance"] },
  { title: "AI ROI Calculator", q: "What will AI cost, and what value can it create?", points: ["Estimated AI ROI", "Payback period", "Total cost view", "Basic value projection"] },
  { title: "AI Performance Index", q: "Is your AI actually performing?", points: ["Performance Index (0–100)", "Adoption snapshot", "Trust signal", "Top performance gap"] },
  { title: "Risk-Adjusted ROI Snapshot", q: "Does risk weaken your AI business case?", points: ["Base ROI", "Risk-adjusted ROI", "Risk confidence score", "Top risk warnings"] },
  { title: "AI Compliance Assessment", q: "Is your AI governance ready for regulators?", points: ["EU AI Act · ISO 42001 · NIST AI RMF", "Compliance score", "Gap register", "30-60-90 roadmap"] },
  { title: "ISO 42001 Readiness", q: "Is your AIMS ready for ISO 42001?", points: ["Overall AIMS maturity score", "Clause-by-clause readiness", "Top 8 priority gaps", "28-week roadmap"] },
] as const;

const TIERS = [
  {
    name: "SARPI Lite / Free™",
    price: "Free",
    audience: "Professionals · Small teams · Early AI exploration",
    features: ["Free AI Readiness Navigator Lite", "Free AI Cost/ROI Navigator Lite", "Free AI Performance Index Lite", "Free Risk-Adjusted ROI Snapshot Lite"],
    cta: "Start Free Tools",
    highlight: false,
  },
  {
    name: "SARPI Pro™",
    price: "Gratis (Free) until " + FREE_UNTIL,
    audience: "AI CoE · CIO · Transformation · Consultants",
    features: ["Saved assessments & scenarios", "Use case workspace", "Comparative scoring", "Pro dashboards & basic reports", "Limited team collaboration"],
    cta: "Claim Founding Member Access",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "SARPI Enterprise™",
    price: "Talk to Us",
    audience: "Enterprises · Banks · Telcos · Governments · Regulators",
    features: ["All 12 SARPI modules", "Enterprise dashboards & heatmaps", "SERT trust layer", "Value Realization Engine", "API integrations & advisory"],
    cta: "Talk to Us",
    highlight: false,
    badge: "Sovereign",
  },
] as const;

function tierBadgeClass(tier: string) {
  if (tier === "Lite") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (tier === "Pro") return "bg-primary/15 text-primary";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

const MODULE_TIER: Record<string, EntTier> = { Lite: "lite", Pro: "pro", Enterprise: "enterprise" };

function SarpiFeaturesPage() {
  const ent = useEntitlement();
  const tierLabel = ent.tier === "enterprise" ? "Enterprise" : ent.tier === "pro" ? "Pro" : "Lite";
  useEffect(() => { trackModuleEvent("sarpi", "view"); }, []);
  return (
    <>
      {/* Founding member beta banner */}
      <div className="dark border-b border-border bg-gradient-to-r from-primary/20 via-background to-background">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-2 px-6 py-3 text-center text-sm text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold">
            Founding Member Beta — Lock in SARPI Pro Gratis (Free) until {FREE_UNTIL}
          </span>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1 font-bold text-primary underline underline-offset-4"
          >
            Become a Founding Member <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <PageHero
        tone="dark"
        eyebrow="SARPI Suite™ · AI Value Intelligence by AIgilityX"
        title={
          <>
            Measure AI Readiness, ROI, Risk, Governance, and Real Business Value
            — in one executive AI suite
          </>
        }
        description="SARPI Suite™ helps leaders move beyond AI activity and measure what truly matters: readiness, use cases, investment priorities, risk confidence, performance, trust, and measurable value realization."
        actions={
          <>
            <Button asChild size="lg">
              <Link to="/pricing">
                <Sparkles className="mr-2 h-4 w-4" /> Claim SARPI Pro — Gratis until {FREE_UNTIL}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/repository">Start Free AI Tools</Link>
            </Button>
          </>
        }
      />

      {/* Signed-in entitlement gate */}
      {ent.isAuthed && !ent.loading && (
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Your SARPI access:</span>
              <Badge className={tierBadgeClass(tierLabel)} variant="secondary">
                SARPI {tierLabel}
              </Badge>
              {ent.isFounding && ent.tier !== "lite" && (
                <span className="text-xs text-muted-foreground">Founding Member · gratis until 31 Dec 2026</span>
              )}
              {ent.expired && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Your founding access has expired — reverted to Lite.
                </span>
              )}
            </div>
            <FoundingAccessBanner sourcePage="/sarpi" />
            {(ent.expired || ent.tier === "lite") && (
              <EntitlementLockCard
                feature="SARPI Pro modules"
                requiredTier="pro"
                description="Pro and Enterprise modules are locked on your current plan. Upgrade or rejoin the Free Pro waitlist to unlock the full SARPI Suite."
                sourcePage="/sarpi"
              />
            )}
          </div>
        </section>
      )}

      {/* 12 modules */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">SARPI Suite</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Twelve connected modules. One executive view.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Modular engines across the full AI value lifecycle — plan, measure, govern, and scale AI value across the enterprise.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ tier, icon: Icon, title, desc }) => {
              const unlocked = ent.isAuthed && !ent.loading && tierUnlocks(ent.tier, MODULE_TIER[tier]);
              const locked = ent.isAuthed && !ent.loading && !unlocked;
              return (
                <Card key={title} className={`flex flex-col ${locked ? "opacity-70" : ""}`}>
                  <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={tierBadgeClass(tier)}>
                          {tier}
                        </Badge>
                        {unlocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Included
                          </span>
                        )}
                        {locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </div>
                      <CardTitle className="mt-2 text-base">{title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                    {locked && (
                      <Link to="/pricing" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        Upgrade to unlock <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Free tools */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Free Tools</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Start free with six AI executive tools
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Get instant insights before you build a full AI roadmap — assess readiness, estimate ROI, measure performance, test risk-adjusted value, and check compliance.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_TOOLS.map((t) => (
              <Card key={t.title} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t.q}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="space-y-1.5 text-sm">
                    {t.points.map((p) => (
                      <li key={p} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Choose your tier</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Right-sized for individuals, teams, and enterprises
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Start with free public tools, unlock SARPI Pro <span className="font-semibold text-foreground">gratis (free) until {FREE_UNTIL}</span>, or engage SARPI Enterprise for organization-wide AI value transformation.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {TIERS.map((t) => (
              <Card
                key={t.name}
                className={`relative flex flex-col ${t.highlight ? "border-primary shadow-lg ring-2 ring-primary/30" : ""}`}
              >
                {"badge" in t && t.badge ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">{t.badge}</Badge>
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {t.highlight && <Crown className="h-5 w-5 text-primary" />}
                    {t.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t.audience}</p>
                  <div className="pt-3 text-2xl font-bold">{t.price}</div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <ul className="space-y-2 text-sm">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-2">
                    <Button className="w-full" variant={t.highlight ? "default" : "outline"} asChild>
                      <Link to={t.name.includes("Lite") ? "/repository" : "/pricing"}>{t.cta}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
