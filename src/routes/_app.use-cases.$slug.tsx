import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { MissingDataFallback } from "@/components/MissingDataFallback";
import { CompareToggle } from "@/components/usecasex/CompareTray";
import { RatingWidget } from "@/components/usecasex/RatingWidget";
import { supabase } from "@/integrations/supabase/client";
import { getUseCase, listUseCases } from "@/lib/use-cases.functions";

// ---------- Helpers ----------
const PLATFORM_BLURB: Record<string, string> = {
  sarpi: "Strategic AI Risk & Performance Index — track adoption, value, and risk.",
  cyberx: "AI cybersecurity governance — secure models, data, and agents.",
  cyberx_c3g: "Cybersecurity, Compliance & Governance for AI.",
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
  { step: 1, name: "UseCasesX", verb: "Discover", to: "/repository" },
  { step: 2, name: "AI Readiness", verb: "Assess", to: "/data-readiness" },
  { step: 3, name: "AI ROI", verb: "Value", to: "/impact-assessment" },
  { step: 4, name: "SARPI", verb: "Track", to: "/sarpi" },
  { step: 5, name: "CyberX", verb: "Govern", to: "/cyberx/c3g/intake" },
  { step: 6, name: "AdvisorX", verb: "Decide", to: "/advisorx" },
  { step: 7, name: "FlowX", verb: "Execute", to: "/flowx/workflow-builder" },
  { step: 8, name: "PrivacyX", verb: "Protect", to: "/privacyx/review" },
  { step: 9, name: "AssureX", verb: "Validate", to: "/assurex/validation" },
];

// ---------- Tracking helpers (client-side, RLS-permitted public inserts) ----------
async function logUseCaseView(useCaseId: string, slug: string) {
  try {
    await supabase.from("use_case_views").insert({
      use_case_id: useCaseId,
      source_page: `//${slug}`,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
  } catch {
    /* non-blocking */
  }
}

async function logCtaEvent(input: {
  cta: string;
  useCaseId?: string | null;
  targetRoute?: string | null;
  targetPlatform?: string | null;
  sourcePage?: string | null;
}) {
  try {
    await supabase.from("cta_events").insert({
      cta: input.cta,
      use_case_id: input.useCaseId ?? null,
      target_route: input.targetRoute ?? null,
      target_platform: input.targetPlatform ?? null,
      source_page: input.sourcePage ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

async function logIntegrationEvent(input: {
  sourceModule: string;
  targetModule: string;
  eventType: string;
  useCaseId: string;
  payload: Record<string, unknown>;
}) {
  try {
    await supabase.from("integration_events").insert({
      source_module: input.sourceModule,
      target_module: input.targetModule,
      event_type: input.eventType,
      use_case_id: input.useCaseId,
      payload: input.payload as any,
    });
  } catch {
    /* non-blocking */
  }
}

// ---------- Route ----------
export const Route = createFileRoute("/_app/use-cases/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — UseCasesX™` },
      {
        name: "description",
        content:
          "AI use case detail — business problem, AI solution, value, data, KPIs, ROI, implementation, governance, cyber, and privacy.",
      },
    ],
  }),
  component: UseCaseDetailPage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Use case failed to load" reason={error.message} />
  ),
  notFoundComponent: () => (
    <MissingDataFallback
      title="Use case not available"
      reason="This use case isn't published or no longer exists."
      backTo="/repository"
      backLabel="Back to Explore"
    />
  ),
});

// ---------- Page ----------
function UseCaseDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadCta, setLeadCta] = useState<"lite-pdf" | "ai-strategy-session">("lite-pdf");

  const detail = useQuery({
    queryKey: ["use-case", "detail", slug],
    queryFn: () => getUseCase({ data: { slug } }),
    staleTime: 60 * 1000,
    retry: false,
  });

  // Detect "not found" from server fn error
  if (detail.error) {
    const msg = (detail.error as Error).message ?? "";
    if (/not found/i.test(msg)) throw notFound();
  }

  const c = detail.data as Record<string, any> | undefined;

  // Track view on first load
  useEffect(() => {
    if (c?.id) void logUseCaseView(c.id, c.slug);
  }, [c?.id, c?.slug]);

  const industryIds: string[] =
    c?.use_case_industries?.map((x: any) => x.industries?.slug).filter(Boolean) ?? [];

  // Related use cases (same industry, exclude current)
  const related = useQuery({
    queryKey: ["use-case", "related", slug, industryIds.join(",")],
    queryFn: () =>
      listUseCases({
        data: { industries: industryIds, limit: 6 },
      }),
    enabled: !!c && industryIds.length > 0,
    staleTime: 60 * 1000,
  });

  if (detail.isLoading) {
    return (
      <div className="mx-auto max-w-[1320px] px-6 py-20 text-center text-sm text-muted-foreground">
        Loading use case…
      </div>
    );
  }
  if (!c) {
    throw notFound();
  }

  const industries = (c.use_case_industries ?? [])
    .map((x: any) => x.industries?.name)
    .filter(Boolean) as string[];
  const businessFunctions = (c.use_case_business_functions ?? [])
    .map((x: any) => x.business_functions?.name)
    .filter(Boolean) as string[];
  const capabilities = (c.use_case_capabilities ?? [])
    .map((x: any) => x.ai_capabilities?.name)
    .filter(Boolean) as string[];
  const objectives = (c.use_case_business_objectives ?? [])
    .map((x: any) => x.business_objectives?.name)
    .filter(Boolean) as string[];

  const platforms: string[] = Array.isArray(c.recommended_platforms)
    ? c.recommended_platforms
    : [];

  const tags: string[] = [...capabilities, ...objectives].slice(0, 8);

  const sourcePage = `//${c.slug}`;
  const qs = `?source=usecasex&use_case_id=${encodeURIComponent(c.id)}`;

  const openLead = (cta: "lite-pdf" | "ai-strategy-session") => {
    setLeadCta(cta);
    setLeadOpen(true);
  };

  const handleSaveToPortfolio = async () => {
    trackCTAEvent("save_to_pro_portfolio", { use_case_id: c.id, slug: c.slug });
    void logCtaEvent({
      cta: "save_to_pro_portfolio",
      useCaseId: c.id,
      targetRoute: "/pro",
      sourcePage,
    });
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate({
        to: "/pro",
        search: { redirect: `//${c.slug}` } as any,
      });
      return;
    }
    try {
      const { saveUseCase } = await import("@/lib/usecasex.services");
      await saveUseCase(c.id, { priority: "Medium" });
      navigate({ to: "/my-use-cases" });
    } catch (e) {
      console.error("[save-to-pro]", e);
    }
  };

  const handleNav = (cta: string, to: string, targetPlatform?: string) => {
    trackCTAEvent(cta, { use_case_id: c.id, slug: c.slug, to });
    void logCtaEvent({
      cta,
      useCaseId: c.id,
      targetRoute: to,
      targetPlatform: targetPlatform ?? null,
      sourcePage,
    });
    navigate({ to: to as any });
  };

  const handleCyberX = () => {
    const payload = {
      use_case_id: c.id,
      title: c.title,
      slug: c.slug,
      industry: industries[0] ?? null,
      business_function: businessFunctions[0] ?? null,
      ai_type: capabilities[0] ?? null,
      value_potential: c.value_potential ?? null,
      complexity_level: c.complexity ?? null,
      risk_level: c.risk_level ?? null,
      risk_classification: c.risk_level ?? null,
      governance_required: !!c.governance_required,
      privacy_review_required: !!c.privacy_review_required,
      cyber_review_required: !!c.cyber_review_required,
      assurance_review_required: !!c.assurance_review_required,
      governance_notes: c.governance_notes ?? null,
      cybersecurity_notes: c.cybersecurity_notes ?? null,
      privacy_notes: c.privacy_notes ?? null,
      recommended_platforms: platforms,
      data_required: c.data_required ?? null,
      kpis: Array.isArray(c.kpis) ? c.kpis : [],
    };
    void logIntegrationEvent({
      sourceModule: "usecasex",
      targetModule: "cyberx_c3g",
      eventType: "governance_review_requested",
      useCaseId: c.id,
      payload: {
        object_type: "use_case",
        object_id: c.id,
        status: "pending",
        ...payload,
      },
    });
    trackCTAEvent("send_to_cyberx_governance", { use_case_id: c.id, slug: c.slug });
    void logCtaEvent({
      cta: "send_to_cyberx_governance",
      useCaseId: c.id,
      targetRoute: `/cyberx/c3g/intake${qs}`,
      targetPlatform: "cyberx_c3g",
      sourcePage: "use_case_detail",
    });
    navigate({ to: `/cyberx/c3g/intake${qs}` as any });
  };


  const handleSarpi = () => {
    const payload = {
      use_case_id: c.id,
      title: c.title,
      slug: c.slug,
      industry: industries[0] ?? null,
      business_function: businessFunctions[0] ?? null,
      ai_type: capabilities[0] ?? null,
      value_potential: c.value_potential ?? null,
      complexity_level: c.complexity ?? null,
      risk_level: c.risk_level ?? null,
      maturity_level: c.maturity_level ?? c.maturity ?? null,
      time_to_value: c.time_to_value ?? null,
      readiness_assessment_ready: true,
      roi_calculation_ready: true,
      kpis: Array.isArray(c.kpis) ? c.kpis : [],
      roi_areas: Array.isArray(c.roi_areas) ? c.roi_areas : [],
      recommended_platforms: platforms,
    };
    void logIntegrationEvent({
      sourceModule: "usecasex",
      targetModule: "sarpi",
      eventType: "readiness_tracking_requested",
      useCaseId: c.id,
      payload: {
        object_type: "use_case",
        object_id: c.id,
        status: "pending",
        ...payload,
      },
    });
    trackCTAEvent("track_in_sarpi", { use_case_id: c.id, slug: c.slug });
    void logCtaEvent({
      cta: "track_in_sarpi",
      useCaseId: c.id,
      targetRoute: `/sarpi${qs}`,
      targetPlatform: "sarpi",
      sourcePage: "use_case_detail",
    });
    navigate({ to: `/sarpi${qs}` as any });
  };

  const relatedItems = (related.data?.cases ?? []).filter((r: any) => r.slug !== c.slug).slice(0, 3);

  return (
    <>
      <article className="bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[1320px] px-6 pb-10 pt-8">
            <Link
              to="/repository"
              className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
            >
              ← Back to Explore
            </Link>
            <div className="mt-5">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {c.title}
              </h1>
              {c.summary && (
                <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{c.summary}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                {industries.map((n) => (
                  <Badge key={n} tone="primary">{n}</Badge>
                ))}
                {businessFunctions.map((n) => (
                  <Badge key={n}>{n}</Badge>
                ))}
                {capabilities.slice(0, 3).map((n) => (
                  <Badge key={n}>{n}</Badge>
                ))}
                {c.value_potential && (
                  <Badge tone={c.value_potential === "High" ? "success" : "muted"}>
                    Value · {c.value_potential}
                  </Badge>
                )}
                {c.complexity && (
                  <Badge tone={c.complexity === "High" ? "warning" : "muted"}>
                    Complexity · {c.complexity}
                  </Badge>
                )}
                {c.risk_level && (
                  <Badge tone={c.risk_level === "Critical" || c.risk_level === "High" ? "danger" : "muted"}>
                    Risk · {c.risk_level}
                  </Badge>
                )}
                {c.time_to_value && <Badge>TTV · {c.time_to_value}</Badge>}
                {(c.maturity_level || c.maturity) && <Badge>Maturity · {c.maturity_level ?? c.maturity}</Badge>}
              </div>
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <CompareToggle slug={c.slug} />
              </div>
            </div>
          </div>
        </header>

        {/* Body + Sidebar */}
        <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            {c.business_problem && (
              <Section label="01 · Business Problem">
                <p className="text-muted-foreground whitespace-pre-line">{c.business_problem}</p>
              </Section>
            )}
            {(c.ai_solution_concept || c.solution) && (
              <Section label="02 · AI Solution Concept">
                <p className="text-muted-foreground whitespace-pre-line">{c.ai_solution_concept ?? c.solution}</p>
              </Section>
            )}
            {(c.business_value || c.outcomes) && (
              <Section label="03 · Business Value">
                <p className="text-muted-foreground whitespace-pre-line">{c.business_value ?? c.outcomes}</p>
              </Section>
            )}
            {c.data_required && (
              <Section label="04 · Data Required">
                <p className="text-muted-foreground whitespace-pre-line">{c.data_required}</p>
              </Section>
            )}
            {Array.isArray(c.kpis) && c.kpis.length > 0 && (
              <Section label="05 · KPIs">
                <BulletList items={c.kpis as string[]} />
              </Section>
            )}
            {Array.isArray(c.roi_areas) && c.roi_areas.length > 0 && (
              <Section label="06 · ROI Areas">
                <BulletList items={c.roi_areas as string[]} />
              </Section>
            )}
            {c.governance_notes && (
              <Section label="07 · Governance Notes">
                <p className="text-muted-foreground whitespace-pre-line">{c.governance_notes}</p>
              </Section>
            )}
            {c.cybersecurity_notes && (
              <Section label="08 · Cybersecurity Notes">
                <p className="text-muted-foreground whitespace-pre-line">{c.cybersecurity_notes}</p>
              </Section>
            )}
            {c.privacy_notes && (
              <Section label="09 · Privacy Notes">
                <p className="text-muted-foreground whitespace-pre-line">{c.privacy_notes}</p>
              </Section>
            )}

            {platforms.length > 0 && (
              <Section label="10 · Recommended AIgilityX Modules">
                <div className="grid gap-3 sm:grid-cols-2">
                  {platforms.map((slug) => (
                    <div
                      key={slug}
                      className="rounded-lg border border-border bg-card/60 p-4 transition hover:border-primary/40"
                    >
                      <div className="text-sm font-bold text-foreground uppercase">{slug}</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {PLATFORM_BLURB[slug] ?? "AIgilityX module."}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {relatedItems.length > 0 && (
              <Section label="11 · Related Use Cases">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedItems.map((r: any) => (
                    <Link
                      key={r.slug}
                      to="/use-cases/$slug"
                      params={{ slug: r.slug }}
                      className="group rounded-lg border border-border bg-card/60 p-4 transition hover:border-primary/40"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        {r.use_case_industries?.[0]?.industries?.name ?? ""}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary">
                        {r.title}
                      </div>
                      {r.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.summary}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* CTA Panel */}
            <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8">
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
                12 · Take action
              </div>
              <h2 className="mt-2 text-2xl font-bold text-foreground">Move this use case forward</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Route this use case into the AIgilityX execution path.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CtaBtn primary onClick={() => handleNav("check_ai_readiness", `//readiness${qs}`)}>
                  Check AI Readiness
                </CtaBtn>
                <CtaBtn primary onClick={() => handleNav("calculate_ai_roi", `//roi-calculator${qs}`)}>
                  Calculate AI ROI
                </CtaBtn>
                <CtaBtn primary onClick={handleSaveToPortfolio}>
                  Save to Pro Portfolio
                </CtaBtn>
                <CtaBtn
                  onClick={() => {
                    trackCTAEvent("download_lite_pdf", { use_case_id: c.id });
                    void logCtaEvent({ cta: "download_lite_pdf", useCaseId: c.id, sourcePage });
                    openLead("lite-pdf");
                  }}
                >
                  Download Lite PDF
                </CtaBtn>
                <CtaBtn
                  onClick={() => {
                    trackCTAEvent("request_ai_strategy_session", { use_case_id: c.id });
                    void logCtaEvent({ cta: "request_ai_strategy_session", useCaseId: c.id, sourcePage });
                    openLead("ai-strategy-session");
                  }}
                >
                  Request AI Strategy Session
                </CtaBtn>
                <CtaBtn onClick={handleCyberX}>Send to CyberX Governance Review</CtaBtn>
                <CtaBtn onClick={handleSarpi}>Send to SARPI Readiness Tracking</CtaBtn>
                <CtaBtn onClick={() => handleNav("ask_advisorx", `/advisorx${qs}`, "advisorx")}>
                  Ask AdvisorX
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("design_flowx_workflow", `/flowx/workflow-builder${qs}`, "flowx")}>
                  Design FlowX Workflow
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("privacyx_review", `/privacyx/review${qs}`, "privacyx")}>
                  PrivacyX Review
                </CtaBtn>
                <CtaBtn onClick={() => handleNav("assurex_validation", `/assurex/validation${qs}`, "assurex")}>
                  AssureX Validation
                </CtaBtn>
              </div>
            </section>

            <RatingWidget slug={c.slug} />
          </div>

          {/* Right sidebar: Execution Path */}
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
                      onClick={() => {
                        trackCTAEvent("execution_path_step", { step: s.step, name: s.name, use_case_id: c.id });
                        void logCtaEvent({
                          cta: "execution_path_step",
                          useCaseId: c.id,
                          targetRoute: s.to,
                          targetPlatform: s.name.toLowerCase(),
                          sourcePage,
                        });
                      }}
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
        sourceUseCaseId={c.id}
        sourceUseCaseTitle={c.title}
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

// ---------- Presentational helpers ----------
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] font-bold uppercase tracking-widest text-primary">{label}</div>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
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
