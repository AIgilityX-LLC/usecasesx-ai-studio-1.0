import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MOCK_USE_CASES, assertMockReady, type MockUseCase } from "@/lib/usecasex.mock";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { MissingDataFallback } from "@/components/MissingDataFallback";
import { CompareToggle, CompareTray } from "@/components/usecasex/CompareTray";
import { RatingWidget } from "@/components/usecasex/RatingWidget";
import { supabase } from "@/integrations/supabase/client";

// -----------------------------------------------------------------------------
// Data resolution (mock first, Supabase-ready)
// -----------------------------------------------------------------------------
function getUseCaseBySlug(slug: string): MockUseCase | null {
  // TODO: replace with `supabase.from("use_cases").select("*").eq("slug", slug).single()`
  return MOCK_USE_CASES.find((u) => u.slug === slug) ?? null;
}

function getRelated(c: MockUseCase): MockUseCase[] {
  return MOCK_USE_CASES.filter(
    (u) => u.slug !== c.slug && u.industry.slug === c.industry.slug,
  ).slice(0, 3);
}

// Derive prose sections from the mock card. Real records will override these.
function derive(c: MockUseCase) {
  return {
    executiveSummary: `${c.title}. ${c.summary} Recommended for ${c.industry.name} ${c.businessFunction.toLowerCase()} teams targeting ${c.objective.toLowerCase()}, with ${c.valuePotential.toLowerCase()} value potential and ${c.timeToValue.toLowerCase()} time to value.`,
    businessProblem: `${c.industry.name} organizations face mounting pressure in ${c.businessFunction.toLowerCase()}: fragmented data, manual decisions, and limited foresight. Today's tooling cannot scale to the volume, velocity, and governance demands that ${c.objective.toLowerCase()} now requires.`,
    aiSolution: `Deploy ${c.aiType.toLowerCase()} on curated, governed data to augment ${c.businessFunction.toLowerCase()} teams. The system ingests source signals, applies ${c.aiType.toLowerCase()} models, and exposes outputs through workflow and decision surfaces — with human review, explainability, and audit logging by default.`,
    businessValue: `Lifts ${c.objective.toLowerCase()} outcomes with measurable impact: faster cycle times, lower unit costs, and improved decision quality. Value potential is rated ${c.valuePotential} with ${c.timeToValue.toLowerCase()} time to first value.`,
    dataRequired: [
      "Authoritative master & reference data for the business domain",
      "Historical transactional or operational records (24–36 months)",
      "Real-time event streams or scheduled extracts from source systems",
      "Labels, outcomes, or ground truth for supervised training",
      "Documented data lineage, sensitivity classification, and retention policy",
    ],
    kpis: [
      `${c.objective} uplift (% improvement vs. baseline)`,
      "Cycle-time reduction (hours → minutes)",
      "Cost-to-serve per transaction (€/$)",
      "Model precision / recall / drift over time",
      "Human override rate and reviewer agreement",
    ],
    roiAreas: [
      "Revenue: incremental sales, retention, pricing uplift",
      "Cost: automation of manual tasks, lower error remediation",
      "Risk: fewer incidents, faster detection, regulator-ready evidence",
      "Experience: faster response, higher satisfaction, fewer escalations",
    ],
    implementationSteps: [
      "Discovery & framing — confirm scope, owners, success metrics",
      "Data readiness — source, quality, governance, access controls",
      "Prototype — small-scope model + workflow with real users",
      "Pilot — instrumented rollout to one team or region",
      "Scale — productionize, integrate, monitor drift",
      "Govern — risk, cyber, privacy, audit sign-off and re-validation",
    ],
    governance: `Risk rating: ${c.riskLevel}. Maturity: ${c.maturity}. Establish an accountable owner, model risk classification, and a re-validation cadence. Document intended use, known limitations, and human-in-the-loop checkpoints. Align with EU AI Act, ISO/IEC 42001, and sector-specific obligations.`,
    cybersecurity: `Apply secure-by-design controls: identity-bound access to data and models, encryption in transit and at rest, prompt-injection and data-exfiltration defenses, and continuous red-team / abuse-case testing. Route material findings through CyberX C3G for governance review.`,
    privacy: `Map personal data flows end-to-end; apply data minimization, purpose limitation, and retention controls. Run a DPIA where appropriate. Honor data subject rights through documented response paths. Route to PrivacyX for formal review before production.`,
  };
}

const PLATFORM_BLURB: Record<string, string> = {
  sarpi: "Strategic AI Risk & Performance Index — track adoption, value, and risk in one operating view.",
  cyberx: "AI cybersecurity governance — secure models, data, and agents across the lifecycle.",
  advisorx: "AI decision support for executives — opportunity, ROI, and risk briefings.",
  flowx: "AI workflow builder — orchestrate humans, models, and systems end-to-end.",
  privacyx: "Privacy-by-design reviews and data protection controls for AI.",
  assurex: "Independent AI assurance and validation aligned to ISO/IEC 42001.",
  auditx: "AI-ready audit trails, evidence, and continuous control monitoring.",
  regulatorx: "Regulatory horizon scanning and obligation mapping.",
  complyx: "Compliance orchestration across AI-impacting frameworks.",
  ares: "Autonomous mission systems platform for defense and security.",
  conversx: "Conversational AI for citizen, customer, and learner journeys.",
  simulax: "Scenario modeling and digital-twin simulation for high-stakes decisions.",
  roi: "AI ROI Calculator — quantify business value of each use case.",
};

const EXECUTION_PATH = [
  { step: 1, name: "UseCaseX", verb: "Discover", to: "/ai-hub/usecasex/explore" },
  { step: 2, name: "AI Readiness", verb: "Assess", to: "/ai-hub/readiness" },
  { step: 3, name: "AI ROI", verb: "Value", to: "/ai-hub/roi-calculator" },
  { step: 4, name: "SARPI", verb: "Track", to: "/sarpi" },
  { step: 5, name: "CyberX", verb: "Govern", to: "/cyberx/c3g/intake" },
  { step: 6, name: "AdvisorX", verb: "Decide", to: "/advisorx" },
  { step: 7, name: "FlowX", verb: "Execute", to: "/flowx/workflow-builder" },
  { step: 8, name: "PrivacyX", verb: "Protect", to: "/privacyx/review" },
  { step: 9, name: "AssureX", verb: "Validate", to: "/assurex/validation" },
];

// -----------------------------------------------------------------------------
// Route
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/ai-hub/usecasex/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — UseCaseX™` },
      {
        name: "description",
        content:
          "AI use case detail — business problem, AI solution, value, data, KPIs, ROI, implementation, governance, cyber, and privacy.",
      },
    ],
  }),
  loader: ({ params }) => {
    const ready = assertMockReady();
    if (!ready.ok) throw new Error(ready.reason);
    const c = getUseCaseBySlug(params.slug);
    if (!c) throw notFound();
    return c;
  },
  component: UseCaseDetailPage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Use case failed to load" reason={error.message} />
  ),
  notFoundComponent: () => (
    <MissingDataFallback
      title="Use case not found"
      reason="We couldn't find that use case. It may have been moved or unpublished."
      backTo="/ai-hub/usecasex/explore"
      backLabel="Back to Explore"
    />
  ),
});

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
function UseCaseDetailPage() {
  const c = Route.useLoaderData();
  const navigate = useNavigate();
  const d = derive(c);
  const related = getRelated(c);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadCta, setLeadCta] = useState<"lite-pdf" | "ai-strategy-session">("lite-pdf");

  const qs = `?source=usecasex&use_case_id=${encodeURIComponent(c.id)}`;

  const openLead = (cta: "lite-pdf" | "ai-strategy-session") => {
    setLeadCta(cta);
    setLeadOpen(true);
  };

  const handleSaveToPortfolio = async () => {
    trackCTAEvent("save_to_pro_portfolio", { use_case_id: c.id, slug: c.slug });
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate({ to: "/ai-hub/usecasex/pro", search: { redirect: `/ai-hub/usecasex/${c.slug}` } as any });
      return;
    }
    // TODO: insert into user's portfolio table once Pro DB is wired
  };

  const handleNav = (cta: string, to: string) => {
    trackCTAEvent(cta, { use_case_id: c.id, slug: c.slug, to });
    navigate({ to: to as any });
  };

  return (
    <>
      <article className="bg-background">
        {/* -------- Header -------- */}
        <header className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[1320px] px-6 pb-10 pt-8">
            <Link
              to="/ai-hub/usecasex/explore"
              className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
            >
              ← Back to Explore
            </Link>
            <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {c.title}
                </h1>
                <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{c.summary}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge tone="primary">{c.industry.name}</Badge>
                  <Badge>{c.businessFunction}</Badge>
                  <Badge>{c.aiType}</Badge>
                  <Badge tone={c.valuePotential === "High" ? "success" : "muted"}>
                    Value · {c.valuePotential}
                  </Badge>
                  <Badge tone={c.complexity === "High" ? "warning" : "muted"}>
                    Complexity · {c.complexity}
                  </Badge>
                  <Badge tone={c.riskLevel === "Critical" || c.riskLevel === "High" ? "danger" : "muted"}>
                    Risk · {c.riskLevel}
                  </Badge>
                  <Badge>TTV · {c.timeToValue}</Badge>
                  <Badge>Maturity · {c.maturity}</Badge>
                  {c.sector === "public" && <Badge tone="primary">Public Sector</Badge>}
                </div>
                {c.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.tags.map((t: string) => (
                      <Link
                        key={t}
                        to="/ai-hub/usecasex/explore"
                        search={{ tags: [t] }}
                        className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <CompareToggle slug={c.slug} />
                </div>
              </div>
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Article",
                  headline: c.title,
                  description: c.summary,
                  about: c.industry.name,
                  keywords: c.tags.join(", "),
                  datePublished: c.publishedAt,
                }),
              }}
            />
          </div>
        </header>

        {/* -------- Body + Sidebar -------- */}
        <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <SectionCard label="01 · Executive Summary">
              <p className="text-base leading-relaxed text-foreground">{d.executiveSummary}</p>
            </SectionCard>

            <Section label="02 · Business Problem">
              <p className="text-muted-foreground">{d.businessProblem}</p>
            </Section>

            <Section label="03 · AI Solution Concept">
              <p className="text-muted-foreground">{d.aiSolution}</p>
            </Section>

            <Section label="04 · Business Value">
              <p className="text-muted-foreground">{d.businessValue}</p>
            </Section>

            <Section label="05 · Data Required">
              <BulletList items={d.dataRequired} />
            </Section>

            <Section label="06 · KPIs">
              <BulletList items={d.kpis} />
            </Section>

            <Section label="07 · ROI Areas">
              <BulletList items={d.roiAreas} />
            </Section>

            <Section label="08 · Implementation Steps">
              <ol className="space-y-3">
                {d.implementationSteps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>
            </Section>

            <Section label="09 · Governance Notes">
              <p className="text-muted-foreground">{d.governance}</p>
            </Section>

            <Section label="10 · Cybersecurity Notes">
              <p className="text-muted-foreground">{d.cybersecurity}</p>
            </Section>

            <Section label="11 · Privacy Notes">
              <p className="text-muted-foreground">{d.privacy}</p>
            </Section>

            <Section label="12 · Recommended AIgilityX Modules">
              <div className="grid gap-3 sm:grid-cols-2">
                {c.platforms.map((p: { slug: string; name: string }) => (
                  <div
                    key={p.slug}
                    className="rounded-lg border border-border bg-card/60 p-4 transition hover:border-primary/40"
                  >
                    <div className="text-sm font-bold text-foreground">{p.name}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PLATFORM_BLURB[p.slug] ?? "AIgilityX module."}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {related.length > 0 && (
              <Section label="13 · Related Use Cases">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      to="/ai-hub/usecasex/$slug"
                      params={{ slug: r.slug }}
                      className="group rounded-lg border border-border bg-card/60 p-4 transition hover:border-primary/40"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        {r.industry.name}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary">
                        {r.title}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.summary}</p>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* -------- CTA Panel -------- */}
            <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8">
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
                14 · Take action
              </div>
              <h2 className="mt-2 text-2xl font-bold text-foreground">Move this use case forward</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Route this use case into the AIgilityX execution path — readiness, ROI, governance, and workflow design.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CtaBtn primary onClick={() => handleNav("check_ai_readiness", `/ai-hub/readiness${qs}`)}>
                  Check AI Readiness
                </CtaBtn>
                <CtaBtn primary onClick={() => handleNav("calculate_ai_roi", `/ai-hub/roi-calculator${qs}`)}>
                  Calculate AI ROI
                </CtaBtn>
                <CtaBtn primary onClick={handleSaveToPortfolio}>
                  Save to Pro Portfolio
                </CtaBtn>
                <CtaBtn onClick={() => { trackCTAEvent("download_lite_pdf", { use_case_id: c.id }); openLead("lite-pdf"); }}>
                  Download Lite PDF
                </CtaBtn>
                <CtaBtn onClick={() => { trackCTAEvent("request_ai_strategy_session", { use_case_id: c.id }); openLead("ai-strategy-session"); }}>
                  Request AI Strategy Session
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("send_to_cyberx_governance_review", `/cyberx/c3g/intake${qs}`)}>
                  Send to CyberX Governance Review
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("ask_advisorx", `/advisorx${qs}`)}>
                  Ask AdvisorX
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("design_flowx_workflow", `/flowx/workflow-builder${qs}`)}>
                  Design FlowX Workflow
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("privacyx_review", `/privacyx/review${qs}`)}>
                  PrivacyX Review
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("assurex_validation", `/assurex/validation${qs}`)}>
                  AssureX Validation
                </CtaBtn>
              </div>
            </section>

            <RatingWidget slug={c.slug} />
          </div>

          {/* -------- Right sidebar: Execution Path -------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                AIgilityX
              </div>
              <h3 className="mt-1 text-base font-bold text-foreground">Execution Path</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                From discovery to validation — the modules this use case will touch.
              </p>
              <ol className="mt-5 space-y-3">
                {EXECUTION_PATH.map((s) => (
                  <li key={s.step}>
                    <Link
                      to={s.to as any}
                      onClick={() =>
                        trackCTAEvent("execution_path_step", { step: s.step, name: s.name, use_case_id: c.id })
                      }
                      className="group flex items-start gap-3 rounded-md p-2 -mx-2 transition hover:bg-primary/5"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-[10px] font-bold text-primary">
                        {s.step}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground group-hover:text-primary">
                          {s.name}
                        </span>
                        <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
                          {s.verb}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </article>

      <LeadCaptureModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        sourceUseCase={c.slug}
        sourcePage="usecase-detail"
        cta={leadCta}
        title={leadCta === "lite-pdf" ? "Download the Lite PDF" : "Request an AI Strategy Session"}
        description={
          leadCta === "lite-pdf"
            ? "Share a few details and we'll email you the Lite report for this use case."
            : "Tell us about your priorities and an AIgilityX advisor will reach out to schedule a session."
        }
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// Local presentational helpers
// -----------------------------------------------------------------------------
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] font-bold uppercase tracking-widest text-primary">{label}</div>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="text-[11px] font-bold uppercase tracking-widest text-primary">{label}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

type BadgeTone = "default" | "primary" | "muted" | "success" | "warning" | "danger";
function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-500",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function CtaBtn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          : "rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
      }
    >
      {children}
    </button>
  );
}
