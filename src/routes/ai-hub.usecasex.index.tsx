import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listUseCases, listTaxonomies, listPlatformModules } from "@/lib/use-cases.functions";
import { UseCaseXHero } from "@/components/UseCaseXHero";
import { IndustryFocusedSection } from "@/components/IndustryFocusedSection";
import { UseCaseCard } from "@/components/UseCaseCard";
import { BUSINESS_OBJECTIVES, PARTNER_PLATFORMS } from "@/lib/usecasex.data";
import { PlatformBadge } from "@/components/PlatformBadge";
import { CTAButtonGroup } from "@/components/CTAButtonGroup";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";

const taxQ = queryOptions({ queryKey: ["taxonomies"], queryFn: () => listTaxonomies(), staleTime: 5*60*1000 });
const featQ = queryOptions({
  queryKey: ["use-cases", "featured-hub"],
  queryFn: () => listUseCases({ data: { q: "", industries: [], capabilities: [], businessFunctions: [], objectives: [], maturity: [], valuePotential: [], complexity: [], riskLevel: [], timeToValue: [], sort: "featured", featuredOnly: true, limit: 6 } }),
  staleTime: 5*60*1000,
});
const allQ = queryOptions({
  queryKey: ["use-cases", "count-hub"],
  queryFn: () => listUseCases({ data: { q: "", industries: [], capabilities: [], businessFunctions: [], objectives: [], maturity: [], valuePotential: [], complexity: [], riskLevel: [], timeToValue: [], sort: "recent", limit: 120 } }),
  staleTime: 5*60*1000,
});
const modulesQ = queryOptions({
  queryKey: ["platform-modules"],
  queryFn: () => listPlatformModules(),
  staleTime: 10*60*1000,
});

export const Route = createFileRoute("/ai-hub/usecasex/")({
  head: () => ({
    meta: [
      { title: "UseCasesX™ — Explore 1000+ AI Use Cases for Your Industry" },
      { name: "description", content: "Discover practical AI, GenAI, Agentic AI and automation use cases across 18+ industries and 20+ business functions. Free Pro access. API-ready ecosystem." },
      { property: "og:title", content: "UseCasesX™ — Global AI Use Cases Repository" },
      { property: "og:description", content: "Built by AIgilityX — the Sovereign AI Ecosystems." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(taxQ),
    context.queryClient.ensureQueryData(featQ),
    context.queryClient.ensureQueryData(allQ),
    context.queryClient.ensureQueryData(modulesQ),
  ]),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

function Page() {
  const { data: tax } = useSuspenseQuery(taxQ);
  const { data: featured } = useSuspenseQuery(featQ);
  const { data: all } = useSuspenseQuery(allQ);
  const { data: modules } = useSuspenseQuery(modulesQ);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadInterest, setLeadInterest] = useState<string>("ai_strategy_session");

  const openLead = (interest: string) => { setLeadInterest(interest); setLeadOpen(true); };

  return (
    <>
      {/* 1. HERO — DARK */}
      <UseCaseXHero
        stats={{
          useCases: Math.max(all.total, 1000),
          industries: Math.max(tax.industries.length, 18),
          businessFunctions: Math.max(tax.businessFunctions?.length ?? 0, 20),
        }}
        onRequestStrategy={() => openLead("ai_strategy_session")}
      />

      {/* 2. SEARCH CTA — LIGHT */}
      <SearchCTASection objectives={BUSINESS_OBJECTIVES.slice(0, 8)} />

      {/* 3. INDUSTRY-FOCUSED — DARK */}
      <div className="surface-dark border-b border-border">
        <IndustryFocusedSection industries={tax.industries} />
      </div>

      {/* 4. FEATURED — LIGHT */}
      <section className="border-b border-border surface-light">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Featured Use Cases</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">High-impact AI use cases right now</h2>
              <p className="mt-2 text-muted-foreground">A curated cross-section from across the repository — strategic, value-rich, and delivery-ready.</p>
            </div>
            <Link to="/ai-hub/usecasex/explore" className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">See all →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.cases.slice(0, 6).map((c) => <UseCaseCard key={c.id} c={c as any} />)}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS — DARK */}
      <HowItWorksSection />

      {/* 6. FREE vs PRO — LIGHT */}
      <section className="border-b border-border surface-light">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Two ways to use UseCasesX™</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Free / Lite — or Pro (also free with registration)</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Tier name="Free / Lite" tag="No login required" features={[
              "Browse, search and filter 1000+ use cases",
              "View full use case detail",
              "Submit lead forms",
              "Download Lite PDF after lead capture",
            ]} cta={{ label: "Explore AI Use Cases →", to: "/ai-hub/usecasex/explore" }} />
            <Tier name="Pro" tag="Free with registration" highlight features={[
              "Save use cases to your private workspace",
              "Score use cases with the AIgilityX engine",
              "Build AI Opportunity Portfolios",
              "Generate Pro reports & dashboards",
            ]} cta={{ label: "Create Free Pro Account", to: "/ai-hub/usecasex/pro" }} />
          </div>
        </div>
      </section>

      {/* 7. ECOSYSTEM JOURNEY — DARK */}
      <EcosystemJourneySection />

      {/* 8. LEAD GEN CTA — LIGHT */}
      <section className="border-b border-border surface-light">
        <div className="mx-auto max-w-[1100px] px-6 py-20 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Talk to an AIgilityX expert</div>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Turn AI ambition into a sovereign, executable strategy.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Book a complimentary AI Strategy Session with our team. We'll shortlist high-value use cases for your
            industry, map them to readiness and risk, and outline the path to ROI.
          </p>
          <div className="mt-8 flex justify-center">
            <CTAButtonGroup align="center" ctas={[
              { label: "Request AI Strategy Session →", onClick: () => openLead("ai_strategy_session") },
              { label: "Create Free Pro Account", to: "/ai-hub/usecasex/pro", variant: "secondary" },
            ]} />
          </div>
        </div>
      </section>

      {/* 9. API INTEGRATION PREVIEW TEASER — DARK */}
      <section className="border-b border-border surface-dark">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.85_0.13_215)]">Sovereign AI Ecosystems</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">API-ready for the full AIgilityX platform.</h2>
              <p className="mt-2 text-white/70">
                UseCasesX™ data flows into SARPI™, CyberX C3G™, AdvisorX™ and 10+ other platforms via a stable
                API + integration-event contract.
              </p>
            </div>
            <Link to="/ai-hub/usecasex/api-integration-preview" className="text-[11px] font-bold uppercase tracking-widest text-[oklch(0.85_0.13_215)] hover:underline">See the API preview →</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.length > 0
              ? modules.map((m) => (
                  <PlatformBadge key={m.slug} name={m.name} category={m.category ?? undefined} color="navy" />
                ))
              : PARTNER_PLATFORMS.map((p) => (
                  <PlatformBadge key={p.slug} name={p.name} category={p.category} color={p.color as "navy"|"blue"|"cyan"} />
                ))}
          </div>
        </div>
      </section>

      {/* 10. FAQ — LIGHT */}
      <FAQSection />

      <LeadCaptureModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        title="Request an AI Strategy Session"
        description="Tell us a little about you and our team will reach out to schedule a complimentary working session."
        cta={leadInterest}
        sourcePage="usecasex-home"
      />
    </>
  );
}

function SearchCTASection({ objectives }: { objectives: string[] }) {
  return (
    <section className="border-b border-border surface-light">
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Search the repository</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Find the right AI use case in seconds.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Search by industry, AI type, business function, value, complexity, risk or readiness.
                Open any use case for the full PRD-ready brief.
              </p>
              <form
                action="/ai-hub/usecasex/explore"
                method="get"
                className="mt-6 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  name="q"
                  placeholder="Try: fraud detection, citizen services, predictive maintenance…"
                  className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  className="rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
                >
                  Search →
                </button>
              </form>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Popular objectives</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {objectives.map((o) => (
                  <Link
                    key={o}
                    to="/ai-hub/usecasex/explore"
                    search={{ objectives: [o] }}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {o}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { n: "01", t: "Discover", d: "Search and filter 1000+ AI use cases by industry, AI type, business function and value." },
    { n: "02", t: "Save", d: "Bookmark relevant use cases to your private Pro workspace." },
    { n: "03", t: "Score", d: "Score each use case with the AIgilityX engine — strategy, value, feasibility, risk, readiness." },
    { n: "04", t: "Prioritize", d: "Rank and shortlist use cases for your next AI investment cycle." },
    { n: "05", t: "Report", d: "Generate executive-grade reports and dashboards for stakeholders." },
    { n: "06", t: "Integrate", d: "Push prioritized use cases into SARPI™, FlowX™, CyberX C3G™ and the wider ecosystem." },
  ];
  return (
    <section className="border-b border-border surface-dark">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.85_0.13_215)]">How UseCasesX™ Works</div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">From discovery to delivery — in six steps.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-all hover:border-[oklch(0.78_0.13_215_/_0.4)]">
              <div className="font-mono text-xs font-bold text-[oklch(0.85_0.13_215)]">{s.n}</div>
              <div className="mt-2 text-lg font-semibold text-white">{s.t}</div>
              <p className="mt-2 text-sm text-white/70">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EcosystemJourneySection() {
  const journey = [
    { p: "UseCasesX™", d: "brings people in." },
    { p: "AI Readiness", d: "tells them where they stand." },
    { p: "AI ROI Calculator", d: "shows the business value." },
    { p: "SARPI™", d: "tracks maturity and performance." },
    { p: "CyberX C3G™", d: "governs the risks." },
    { p: "AdvisorX™", d: "guides the decisions." },
    { p: "FlowX™", d: "executes the workflows." },
    { p: "PrivacyX™", d: "protects data responsibility." },
    { p: "AssureX™", d: "validates trust and assurance." },
  ];
  return (
    <section className="border-b border-border surface-dark">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="max-w-3xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.85_0.13_215)]">AIgilityX Ecosystem Journey</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            One sovereign ecosystem. Nine connected platforms.
          </h2>
          <p className="mt-3 text-white/70">
            UseCasesX™ is the entry point. The rest of the AIgilityX ecosystem takes prioritized use cases all the
            way from readiness, to ROI, to governed delivery and assurance.
          </p>
        </div>
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {journey.map((j, i) => (
            <li key={j.p} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[oklch(0.55_0.22_258)] font-mono text-xs font-bold text-white">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm leading-relaxed text-white">
                <span className="font-bold text-[oklch(0.85_0.13_215)]">{j.p}</span>{" "}
                <span className="text-white/80">{j.d}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: "Is UseCasesX™ really free?", a: "Yes. The Lite tier is free with no login required — browse, search, filter and view every use case. The Pro tier is also free; it just requires a registration so we can save your workspace, scores and portfolios." },
    { q: "Where do the use cases come from?", a: "Each use case is curated by the AIgilityX team. We review every entry for business clarity, AI fit, delivery realism and sovereign-AI considerations — risk, governance and data residency." },
    { q: "Can I use UseCasesX™ data inside our enterprise tools?", a: "Yes. UseCasesX™ exposes a stable API and integration-event contract that feeds the broader AIgilityX ecosystem — SARPI™, CyberX C3G™, AdvisorX™, FlowX™ and more." },
    { q: "Who is UseCasesX™ for?", a: "Executives, public sector leaders, CIOs/CDOs, transformation teams and AI practitioners in regulated industries who need a sovereignty-aware AI opportunity backlog they can act on." },
    { q: "What is an AI Opportunity Portfolio?", a: "A Pro-only feature where you bundle scored use cases into a portfolio, prioritize them, and generate an executive-grade report for funding and delivery decisions." },
    { q: "How do I get started?", a: "Click Explore AI Use Cases to browse the repository, or Create Free Pro Account to unlock saving, scoring and portfolios." },
  ];
  return (
    <section className="border-b border-border surface-light">
      <div className="mx-auto max-w-[1100px] px-6 py-20">
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">FAQ</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Frequently asked questions</h2>
        </div>
        <div className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          {faqs.map((f) => (
            <details key={f.q} className="group p-6 open:bg-secondary/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <span className="text-base font-semibold text-foreground">{f.q}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tier({ name, tag, features, cta, highlight }: { name: string; tag: string; features: string[]; cta: { label: string; to: string }; highlight?: boolean }) {
  return (
    <div className={"rounded-2xl border p-7 shadow-[var(--shadow-card)] " + (highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">{name}</h3>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground">{tag}</span>
      </div>
      <ul className="mt-5 space-y-2.5 text-sm text-foreground/90">
        {features.map((f) => (
          <li key={f} className="flex gap-2"><span className="mt-0.5 text-primary">✓</span><span>{f}</span></li>
        ))}
      </ul>
      <div className="mt-6">
        <CTAButtonGroup ctas={[{ label: cta.label, to: cta.to, variant: highlight ? "primary" : "secondary" }]} />
      </div>
    </div>
  );
}
