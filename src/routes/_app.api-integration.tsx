import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { trackCTAEvent } from "@/lib/usecasex.tracking";

export const Route = createFileRoute("/_app/api-integration")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "UseCasesX™ API Integration Preview — AIgilityX Ecosystem" },
      {
        name: "description",
        content:
          "One independent UseCasesX repository. API-ready integrations for SARPI, CyberX C3G, AdvisorX, FlowX, PrivacyX, and AssureX.",
      },
    ],
  }),
  component: ApiIntegrationPreview,
});

const PLATFORMS = [
  {
    name: "SARPI",
    tag: "Readiness & Value Realization",
    description:
      "Tracks readiness, maturity, performance, and value realization for selected use cases.",
    accent: "from-sky-500/20 to-sky-500/0",
    border: "border-sky-500/30",
  },
  {
    name: "CyberX C3G",
    tag: "Compliance · Risk · Control · Governance",
    description:
      "Governs high-risk AI use cases through compliance, risk, control, evidence, assurance, and board reporting workflows.",
    accent: "from-rose-500/20 to-rose-500/0",
    border: "border-rose-500/30",
  },
  {
    name: "AdvisorX",
    tag: "Executive & Board Advisory",
    description: "Converts use case portfolios into executive recommendations and board briefs.",
    accent: "from-amber-500/20 to-amber-500/0",
    border: "border-amber-500/30",
  },
  {
    name: "FlowX",
    tag: "Agentic Workflow Design",
    description: "Converts use cases into agentic workflows and automation designs.",
    accent: "from-emerald-500/20 to-emerald-500/0",
    border: "border-emerald-500/30",
  },
  {
    name: "PrivacyX",
    tag: "Privacy & Data Protection",
    description: "Assesses privacy-sensitive use cases and data protection requirements.",
    accent: "from-violet-500/20 to-violet-500/0",
    border: "border-violet-500/30",
  },
  {
    name: "AssureX",
    tag: "Trust · Assurance · Explainability",
    description: "Validates trust, assurance, evidence, explainability, and human oversight.",
    accent: "from-cyan-500/20 to-cyan-500/0",
    border: "border-cyan-500/30",
  },
] as const;

const PRINCIPLES = [
  {
    t: "UseCasesX remains independent",
    d: "A single source of truth for AI opportunity intelligence — owned, versioned, and governed centrally.",
  },
  {
    t: "Platforms consume via APIs",
    d: "SARPI, CyberX, AdvisorX, FlowX, PrivacyX, and AssureX read UseCasesX intelligence on demand — no forks, no copies.",
  },
  {
    t: "No duplicate repositories",
    d: "Every platform extension queries the same canonical use case records and portfolios.",
  },
  {
    t: "Pro powers customized extensions",
    d: "Pro scoring, portfolios, and reports become the foundation for downstream platform-specific workflows.",
  },
  {
    t: "Central repository, distributed usage",
    d: "Write once in UseCasesX. Use everywhere across the AIgilityX ecosystem.",
  },
];

const ENDPOINTS: { method: "GET" | "POST"; path: string; purpose: string }[] = [
  {
    method: "GET",
    path: "/api/usecasex/use-cases",
    purpose: "List all published use cases with classification metadata.",
  },
  {
    method: "GET",
    path: "/api/usecasex/use-cases/{id}/integration-metadata",
    purpose:
      "Fetch integration-ready metadata for a single use case (risk, ROI, readiness, platforms).",
  },
  {
    method: "GET",
    path: "/api/usecasex/portfolios/{portfolio_id}/integration-package",
    purpose: "Export a portfolio as an integration package for downstream platforms.",
  },
  {
    method: "POST",
    path: "/api/usecasex/integration-events",
    purpose: "Notify UseCasesX of downstream events (scored, governed, validated, deployed).",
  },
];

function ApiIntegrationPreview() {
  const [open, setOpen] = useState(false);

  function openModal() {
    trackCTAEvent("api_integration_review_requested", {
      source_page: "/api-integration",
    });
    setOpen(true);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            UseCasesX™ · API Integration Preview
          </div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            UseCasesX Powers AI Opportunity Intelligence Across the AIgilityX Ecosystem
          </h1>
          <p className="mt-6 max-w-3xl text-pretty text-lg text-muted-foreground md:text-xl">
            One independent repository. Multiple platform extensions. API-ready for SARPI, CyberX
            C3G, AdvisorX, FlowX, PrivacyX, AssureX, and future AIgilityX platforms.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
            >
              Request Integration Architecture Review
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border border-border bg-card/50 px-5 py-3 text-sm font-medium text-foreground/90 backdrop-blur transition hover:bg-card"
            >
              Back to UseCasesX
            </Link>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Architecture principles
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Central repository. Distributed usage.
            </h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div
              key={p.t}
              className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/40"
            >
              <h3 className="text-base font-semibold">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Diagram */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent p-8 text-center">
              <div className="text-xs uppercase tracking-widest text-primary">Source of truth</div>
              <div className="mt-2 text-2xl font-semibold">UseCasesX™</div>
              <p className="mt-3 text-sm text-muted-foreground">
                Independent AI use case repository · Pro scoring · Portfolios · Reports
              </p>
            </div>
            <div className="hidden text-center text-3xl text-muted-foreground md:block">⟶</div>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => (
                <div
                  key={p.name}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2 text-center text-sm font-medium"
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integration cards */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Platform extensions
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Six ecosystem integrations, one shared intelligence layer
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((p) => (
            <article
              key={p.name}
              className={`group relative overflow-hidden rounded-xl border ${p.border} bg-card p-6 transition hover:-translate-y-0.5`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${p.accent} opacity-60`}
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xl font-semibold">{p.name}</h3>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    API
                  </span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {p.tag}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-foreground/85">{p.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Endpoints */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Mock API surface
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Endpoint preview
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              A representative slice of the UseCasesX integration API. Final contracts are issued
              during the Integration Architecture Review.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-background font-mono text-sm">
            {ENDPOINTS.map((e, i) => (
              <div
                key={e.path}
                className={`flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:gap-6 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <span
                  className={`inline-flex w-fit items-center rounded px-2 py-0.5 text-xs font-semibold ${
                    e.method === "GET"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {e.method}
                </span>
                <code className="text-foreground">{e.path}</code>
                <span className="font-sans text-xs text-muted-foreground md:ml-auto md:text-right">
                  {e.purpose}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-10 md:p-14">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to plug UseCasesX into your AIgilityX stack?
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Request an Integration Architecture Review and we'll map the right APIs, governance
            touchpoints, and platform extensions for your organization.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
          >
            Request Integration Architecture Review
          </button>
        </div>
      </section>

      <LeadCaptureModal
        open={open}
        onClose={() => setOpen(false)}
        triggerCase="ai-strategy-session"
        title="Request Integration Architecture Review"
        description="Tell us about your AIgilityX integration goals. Our architects will design the right API and governance touchpoints for SARPI, CyberX, AdvisorX, FlowX, PrivacyX, and AssureX."
        sourcePage="/api-integration"
        sourceUseCase="api_integration"
      />
    </div>
  );
}
