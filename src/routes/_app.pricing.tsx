import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, Minus, Sparkles, Shield, Crown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/usecasex/PageHero";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { FoundingAccessBanner } from "@/components/FoundingAccessBanner";
import { useEntitlement } from "@/hooks/useEntitlement";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FREE_UNTIL = "31 Dec 2026";

export const Route = createFileRoute("/_app/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — UseCasesX™" },
      { name: "description", content: "Choose the right plan: Lite, Pro, or Enterprise Sovereign AI System." },
      { property: "og:title", content: "UseCasesX™ Pricing" },
      { property: "og:description", content: "Lite, Pro, and Enterprise plans for AI use case discovery and governance." },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  key: "lite" | "pro" | "enterprise";
  name: string;
  tagline: string;
  price: string;
  cta: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
  limits?: string[];
};

const PLANS: Plan[] = [
  {
    key: "lite",
    name: "Lite",
    tagline: "Get started with AI use case discovery.",
    price: "Free",
    cta: "Start free",
    features: [
      "Global Repository — free patterns only",
      "1 active discovery board",
      "Up to 3 active use cases",
      "Manual feasibility scoring",
      "Basic blueprint PDF export",
    ],
    limits: [
      "No SARPI™ integration",
      "No AdvisorX™ integration",
      "No C3G™ governance",
      "No portfolio optimizer",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "End-to-end discovery, design, governance, and roadmap.",
    price: "Contact sales",
    cta: "Upgrade to Pro",
    highlight: true,
    badge: "Most popular",
    features: [
      "Full Global Repository",
      "Unlimited boards & use cases",
      "AI ideation co-pilot",
      "Data Readiness canvas",
      "Blueprint Builder",
      "SARPI™ draft link",
      "AdvisorX™ review (simulation / API)",
      "C3G™ governance draft link",
      "Portfolio Roadmap",
      "Advanced exports (PDF, Word, CSV)",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise Sovereign AI System",
    tagline: "For governments, regulators, and large enterprises.",
    price: "Custom",
    cta: "Talk to sales",
    badge: "Sovereign",
    features: [
      "Everything in Pro",
      "Sovereign AI System label",
      "Multi-organization / agency hierarchy",
      "Custom governance templates",
      "Advanced audit trail",
      "Local deployment readiness fields",
      "Customer-managed framework settings",
      "Decision Provenance Report",
      "Regulator / auditor views",
    ],
  },
];

type Cmp = boolean | string;
type CmpRow = { label: string; lite: Cmp; pro: Cmp; enterprise: Cmp };
type CmpGroup = { group: string; rows: CmpRow[] };

const COMPARISON: CmpGroup[] = [
  {
    group: "Discovery & Repository",
    rows: [
      { label: "Global AI Use Cases Repository", lite: "Free patterns", pro: true, enterprise: true },
      { label: "Advanced filters & saved views", lite: false, pro: true, enterprise: true },
      { label: "Use case comparison view", lite: "Up to 2", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Evidence & citations drawer", lite: true, pro: true, enterprise: true },
      { label: "Export (PDF / JSON)", lite: "Basic", pro: true, enterprise: true },
    ],
  },
  {
    group: "Boards & Studio",
    rows: [
      { label: "Use Case Boards", lite: "1 board", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Active use cases", lite: "Up to 3", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "AI ideation co-pilot", lite: false, pro: true, enterprise: true },
      { label: "Data Readiness canvas", lite: false, pro: true, enterprise: true },
      { label: "Blueprint Builder", lite: "Basic PDF", pro: true, enterprise: true },
      { label: "Feasibility scoring", lite: "Manual", pro: "Assisted", enterprise: "Assisted" },
    ],
  },
  {
    group: "Intelligence & Governance",
    rows: [
      { label: "SARPI™ integration", lite: false, pro: "Draft link", enterprise: "Full suite" },
      { label: "AdvisorX™ review", lite: false, pro: true, enterprise: true },
      { label: "C3G™ governance", lite: false, pro: "Draft link", enterprise: "Full workflow" },
      { label: "Portfolio Roadmap & optimizer", lite: false, pro: true, enterprise: true },
      { label: "Decision Provenance Report™", lite: false, pro: "Activity history", enterprise: true },
    ],
  },
  {
    group: "Organization & Compliance",
    rows: [
      { label: "Multi-org / agency hierarchy", lite: false, pro: false, enterprise: true },
      { label: "Custom governance templates", lite: false, pro: false, enterprise: true },
      { label: "Sovereign AI System™ label", lite: false, pro: false, enterprise: true },
      { label: "Regulator / auditor views", lite: false, pro: false, enterprise: true },
      { label: "Advanced audit trail", lite: false, pro: "Standard", enterprise: true },
      { label: "Support", lite: "Community", pro: "Priority", enterprise: "Dedicated" },
    ],
  },
];

function PricingPage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const ent = useEntitlement();
  const [highlightMine, setHighlightMine] = useState(true);
  const myPlan = ent.isAuthed && !ent.loading ? ent.tier : null;
  const mineOn = highlightMine && !!myPlan;
  return (
    <>
      {/* Founding member banner */}
      <div className="dark border-b border-border bg-gradient-to-r from-primary/20 via-background to-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-6 py-3 text-center text-sm text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold">
            Founding Member early access — free UseCasesX Pro, gratis until {FREE_UNTIL}
          </span>
          <button
            onClick={() => setWaitlistOpen(true)}
            className="inline-flex items-center gap-1 font-bold text-primary underline underline-offset-4"
          >
            Join the waitlist <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <PageHero
        tone="dark"
        eyebrow="Plans"
        title="Pricing built for AI use case maturity"
        description="Start free with the Lite plan. Unlock the full discovery, scoring, blueprint, and governance workflow with Pro. Run sovereign, regulator-grade deployments with Enterprise."
        actions={
          <>
            <Button size="lg" onClick={() => setWaitlistOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> Get Pro free until {FREE_UNTIL}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Start free</Link>
            </Button>
          </>
        }
      />

      {/* Founding member offer */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-14">
          {ent.isAuthed && (
            <div className="mb-8">
              <FoundingAccessBanner sourcePage="/pricing" />
            </div>
          )}
          <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card ring-1 ring-primary/20">
            <CardContent className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <Badge className="bg-primary text-primary-foreground">Founding Member Program</Badge>
                <h2 className="mt-3 text-2xl font-bold tracking-tight">
                  Free Pro access — gratis until {FREE_UNTIL}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Eligible founding members unlock the full UseCasesX™ Pro experience — repository, Studio, boards,
                  SARPI™, AdvisorX™, C3G™ governance, and portfolio roadmap — completely free through {FREE_UNTIL}.
                  Join the early-access waitlist and we'll confirm your spot.
                </p>
                <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {[
                    "No credit card required",
                    "Full Pro feature set unlocked",
                    "Priority onboarding & support",
                    "Lock in founding-member pricing after 2026",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <Button size="lg" onClick={() => setWaitlistOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4" /> Join the Free Pro waitlist
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card
            key={p.key}
            className={`relative flex flex-col ${
              p.highlight ? "border-primary shadow-lg ring-2 ring-primary/30" : ""
            }`}
          >
            {p.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  {p.badge}
                </Badge>
              </div>
            )}
            {myPlan === p.key && (
              <div className="absolute -top-3 right-3">
                <Badge className="bg-emerald-600 text-white">Your plan</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {p.key === "enterprise" && <Shield className="h-5 w-5 text-primary" />}
                {p.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{p.tagline}</p>
              <div className="pt-3 text-3xl font-bold">{p.price}</div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {p.limits && (
                <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                  {p.limits.map((l) => (
                    <li key={l}>— {l}</li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-4">
                <Button
                  className="w-full"
                  variant={p.highlight ? "default" : "outline"}
                  asChild
                >
                  <Link to={p.key === "lite" ? "/auth" : "/"}>{p.cta}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Need something custom? <Link to="/" className="underline">Contact us</Link>{" "}
        about regulator, auditor, or multi-tenant Sovereign AI System deployments.
      </p>
    </div>
      </section>

      {/* Feature comparison table */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Compare plans</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Lite vs Pro vs Enterprise — feature by feature
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every capability across UseCasesX™ discovery, design, governance, and roadmap. Pro is
            <span className="font-semibold text-foreground"> free until {FREE_UNTIL}</span> for founding members.
          </p>
          {myPlan && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
              <Switch id="highlight-plan" checked={highlightMine} onCheckedChange={setHighlightMine} />
              <label htmlFor="highlight-plan" className="cursor-pointer text-sm font-medium">
                Highlight my plan
                <span className="ml-1.5 rounded bg-emerald-600/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  {myPlan}
                </span>
              </label>
            </div>
          )}
          <div className="mt-8 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/60">
                  <TableHead className="min-w-[220px] text-foreground">Feature</TableHead>
                  <TableHead className={`text-center text-foreground ${mineOn && myPlan === "lite" ? "bg-emerald-500/10" : ""}`}>
                    Lite {mineOn && myPlan === "lite" && <span className="ml-1 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">You</span>}
                  </TableHead>
                  <TableHead className={`text-center text-foreground ${mineOn && myPlan === "pro" ? "bg-emerald-500/10" : ""}`}>
                    Pro
                    <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                      Free
                    </span>
                    {mineOn && myPlan === "pro" && <span className="ml-1 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">You</span>}
                  </TableHead>
                  <TableHead className={`text-center text-foreground ${mineOn && myPlan === "enterprise" ? "bg-emerald-500/10" : ""}`}>
                    Enterprise {mineOn && myPlan === "enterprise" && <span className="ml-1 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">You</span>}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON.map((group) => (
                  <Fragment key={group.group}>
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={4} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {group.group}
                      </TableCell>
                    </TableRow>
                    {group.rows.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <Cell value={row.lite} highlight={mineOn && myPlan === "lite"} />
                        <Cell value={row.pro} highlight={mineOn && myPlan === "pro"} />
                        <Cell value={row.enterprise} highlight={mineOn && myPlan === "enterprise"} />
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={() => setWaitlistOpen(true)}>
              <Crown className="mr-2 h-4 w-4" /> Claim free Pro until {FREE_UNTIL}
            </Button>
          </div>
        </div>
      </section>

      <LeadCaptureModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        triggerCase="founding-member"
        sourcePage="/pricing"
      />
    </>
  );
}

function Cell({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  const hl = highlight ? "bg-emerald-500/10" : "";
  if (value === true) {
    return (
      <TableCell className={`text-center ${hl}`}>
        <Check className="mx-auto h-4 w-4 text-emerald-500" />
      </TableCell>
    );
  }
  if (value === false) {
    return (
      <TableCell className={`text-center ${hl}`}>
        <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
      </TableCell>
    );
  }
  return <TableCell className={`text-center text-sm text-muted-foreground ${hl}`}>{value}</TableCell>;
}
