import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Sparkles, Shield, Crown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/usecasex/PageHero";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
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

function PricingPage() {
  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Plans"
        title="Pricing built for AI use case maturity"
        description="Start free with the Lite plan. Unlock the full discovery, scoring, blueprint, and governance workflow with Pro. Run sovereign, regulator-grade deployments with Enterprise."
      />
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
    </>
  );
}
