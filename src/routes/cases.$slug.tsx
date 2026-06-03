import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { getUseCase, logCtaEvent } from "@/lib/use-cases.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";

const useCaseQuery = (slug: string) =>
  queryOptions({
    queryKey: ["use-case", slug],
    queryFn: () => getUseCase({ data: { slug } }),
  });

export const Route = createFileRoute("/cases/$slug")({
  head: ({ loaderData }: { loaderData?: { title: string; summary: string } }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — UseCasesX™` },
          { name: "description", content: loaderData.summary },
          { property: "og:title", content: loaderData.title },
          { property: "og:description", content: loaderData.summary },
        ]
      : [{ title: "Use case — UseCasesX™" }],
  }),
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(useCaseQuery(params.slug));
    } catch {
      throw notFound();
    }
  },
  component: CaseDetail,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 p-16 text-center">
        <h1 className="text-3xl font-bold">Use case not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been unpublished or moved.</p>
        <Link to="/explore" className="mt-6 inline-block text-primary underline">
          ← Back to repository
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-destructive">{error.message}</div>
  ),
});

// Platform → outbound CTA hook. URLs are stable per PRD; SARPI and CyberX C3G
// are explicitly called out in scope. Others stub against the hub.
const PLATFORMS: Array<{ key: string; name: string; tagline: string; href: (id: string) => string }> = [
  { key: "advisorx", name: "AdvisorX™", tagline: "Get a tailored AI advisory plan", href: (id) => `https://hub.aigilityx.com/advisorx?source=usecasex&use_case_id=${id}` },
  { key: "flowx", name: "FlowX™", tagline: "Design the agentic workflow", href: (id) => `https://hub.aigilityx.com/flowx?source=usecasex&use_case_id=${id}` },
  { key: "sarpi", name: "SARPI™", tagline: "Add to your strategic AI roadmap", href: (id) => `https://hub.aigilityx.com/sarpi?source=usecasex&use_case_id=${id}` },
  { key: "cyberx-c3g", name: "CyberX C3G™", tagline: "Run cybersecurity, compliance & governance review", href: (id) => `https://hub.aigilityx.com/cyberx-c3g?source=usecasex&use_case_id=${id}` },
  { key: "privacyx", name: "PrivacyX™", tagline: "Run privacy impact assessment", href: (id) => `https://hub.aigilityx.com/privacyx?source=usecasex&use_case_id=${id}` },
  { key: "assurex", name: "AssureX™", tagline: "Validate AI assurance posture", href: (id) => `https://hub.aigilityx.com/assurex?source=usecasex&use_case_id=${id}` },
];

function CaseDetail() {
  const { slug } = Route.useParams();
  const { data: c } = useSuspenseQuery(useCaseQuery(slug));
  const logCta = useServerFn(logCtaEvent);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadCta, setLeadCta] = useState<string>("lite-pdf");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cc = c as any;

  const metrics = ((cc.use_case_metrics ?? []) as Array<{ id: string; label: string; value: string; unit?: string | null; sort_order?: number | null }>)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const links = (cc.use_case_links ?? []) as Array<{ id: string; label: string; url: string; kind?: string | null }>;
  const industries = ((cc.use_case_industries ?? []) as Array<{ industries?: { name?: string } }>)
    .map((x) => x.industries?.name)
    .filter(Boolean) as string[];
  const capabilities = ((cc.use_case_capabilities ?? []) as Array<{ ai_capabilities?: { name?: string } }>)
    .map((x) => x.ai_capabilities?.name)
    .filter(Boolean) as string[];
  const objectives = ((cc.use_case_business_objectives ?? []) as Array<{ business_objectives?: { name?: string } }>)
    .map((x) => x.business_objectives?.name)
    .filter(Boolean) as string[];
  const functions_ = ((cc.use_case_business_functions ?? []) as Array<{ business_functions?: { name?: string } }>)
    .map((x) => x.business_functions?.name)
    .filter(Boolean) as string[];

  const kpis = (cc.kpis ?? []) as string[];
  const roi = (cc.roi_areas ?? []) as string[];
  const platforms = (cc.recommended_platforms ?? []) as string[];

  const onPlatform = async (key: string, name: string, href: string) => {
    try {
      await logCta({
        data: {
          cta: "platform-handoff",
          useCaseId: cc.id,
          targetPlatform: key,
          targetRoute: href,
          sourcePage: typeof window !== "undefined" ? window.location.pathname : null,
        },
      });
    } catch {
      // analytics is best-effort
    }
    if (typeof window !== "undefined") window.open(href, "_blank", "noopener,noreferrer");
  };

  const openLead = (cta: string) => {
    setLeadCta(cta);
    setLeadOpen(true);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/explore" className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Repository
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.82 0.13 210 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(0.82 0.13 210 / 0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative grid gap-0 md:grid-cols-5">
            <div className="p-10 md:col-span-3">
              <div className="mb-6 flex items-center gap-3">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {cc.is_featured ? "Featured Deployment" : "Use Case"}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">{cc.title}</h1>
              {cc.organization ? (
                <p className="mb-6 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {cc.organization}
                  {cc.organization_type ? ` · ${cc.organization_type}` : ""}
                  {cc.region ? ` · ${cc.region}` : ""}
                </p>
              ) : null}
              <p className="mb-8 max-w-2xl text-foreground/80">{cc.summary}</p>

              {metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  {metrics.slice(0, 4).map((m) => (
                    <div key={m.id} className="border-l-2 border-primary/40 pl-3">
                      <span className="block font-mono text-2xl font-bold text-primary">
                        {m.value}
                        {m.unit ?? ""}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border md:col-span-2 md:border-l md:border-t-0">
              <div className="grid h-full grid-cols-2 gap-px bg-border">
                {(["maturity", "impact", "effort", "risk"] as const).map((k) => {
                  const score = cc[`${k}_score`] as number | null;
                  return (
                    <div key={k} className="bg-card p-5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
                      <div className="mt-3 flex items-end gap-1">
                        <span className="font-mono text-3xl font-bold text-primary">{score ?? "—"}</span>
                        {score ? <span className="pb-1 text-xs text-muted-foreground">/5</span> : null}
                      </div>
                      {score ? (
                        <div className="mt-3 flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={"h-1 flex-1 rounded-sm " + (i < score ? "bg-primary" : "bg-border")} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {cc.value_potential && <Chip label="Value" value={cc.value_potential} />}
          {cc.complexity && <Chip label="Complexity" value={cc.complexity} />}
          {cc.risk_level && <Chip label="Risk" value={cc.risk_level} />}
          {cc.time_to_value && <Chip label="Time-to-Value" value={cc.time_to_value} />}
          {cc.maturity_level && <Chip label="Maturity" value={cc.maturity_level} />}
        </div>

        {/* Body */}
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <Section title="Business Problem">{cc.business_problem || cc.problem || "—"}</Section>
            <Section title="AI Solution Concept">{cc.ai_solution_concept || cc.solution || "—"}</Section>
            <Section title="Business Value">{cc.business_value || cc.outcomes || "—"}</Section>
            {cc.data_required && <Section title="Data Required">{cc.data_required}</Section>}

            {(kpis.length > 0 || roi.length > 0) && (
              <div className="grid gap-6 sm:grid-cols-2">
                {kpis.length > 0 && <ListBlock title="KPIs" items={kpis} />}
                {roi.length > 0 && <ListBlock title="ROI Areas" items={roi} />}
              </div>
            )}

            {(cc.governance_notes || cc.cybersecurity_notes || cc.privacy_notes) && (
              <div className="rounded-xl border border-border bg-card/40 p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Risk & Governance</h2>
                <div className="space-y-4 text-sm text-foreground/85">
                  {cc.governance_notes && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Governance</div>
                      <p className="mt-1 whitespace-pre-line">{cc.governance_notes}</p>
                    </div>
                  )}
                  {cc.cybersecurity_notes && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cybersecurity</div>
                      <p className="mt-1 whitespace-pre-line">{cc.cybersecurity_notes}</p>
                    </div>
                  )}
                  {cc.privacy_notes && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Privacy</div>
                      <p className="mt-1 whitespace-pre-line">{cc.privacy_notes}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {cc.governance_required && <Pill>Governance review</Pill>}
                    {cc.privacy_review_required && <Pill>Privacy review</Pill>}
                    {cc.cyber_review_required && <Pill>Cybersecurity review</Pill>}
                    {cc.assurance_review_required && <Pill>Assurance review</Pill>}
                  </div>
                </div>
              </div>
            )}

            {/* CTA STRIP — platform handoffs */}
            <div className="rounded-xl border border-primary/30 bg-card p-6">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Next step</div>
              <h2 className="text-xl font-bold">Take this use case forward</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hand off to an AIgilityX AI Hub platform — your context travels with you.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => onPlatform(p.key, p.name, p.href(cc.id))}
                    className="group flex items-center justify-between rounded-lg border border-border bg-background/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    <div>
                      <div className="text-sm font-bold text-foreground group-hover:text-primary">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.tagline}</div>
                    </div>
                    <span className="text-primary">→</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
                <button
                  onClick={() => openLead("lite-pdf")}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
                >
                  Download Lite report (PDF)
                </button>
                <button
                  onClick={() => openLead("talk-to-aigilityx")}
                  className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-bold hover:border-primary/40 hover:text-primary"
                >
                  Talk to AIgilityX
                </button>
                <Link
                  to="/auth"
                  className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-bold hover:border-primary/40 hover:text-primary"
                >
                  Save to my workspace (Pro)
                </Link>
              </div>
            </div>
          </div>

          <aside className="space-y-8">
            {industries.length > 0 && <TagBlock title="Industries" items={industries} />}
            {capabilities.length > 0 && <TagBlock title="AI Types" items={capabilities} />}
            {functions_.length > 0 && <TagBlock title="Business Functions" items={functions_} />}
            {objectives.length > 0 && <TagBlock title="Business Objectives" items={objectives} />}
            {platforms.length > 0 && <TagBlock title="Recommended Platforms" items={platforms} />}
            {links.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Evidence</h3>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l.id}>
                      <a href={l.url} target="_blank" rel="noreferrer noopener" className="text-sm text-primary underline-offset-4 hover:underline">
                        {l.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>

      <LeadCaptureModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        cta={leadCta}
        sourceUseCase={cc.id}
        title={leadCta === "lite-pdf" ? "Unlock the Lite report" : "Talk to AIgilityX"}
        description={
          leadCta === "lite-pdf"
            ? "Drop a few details and we'll email you the Lite one-pager plus a tailored intro."
            : "Tell us where you're heading — an AIgilityX advisor will follow up within 1 business day."
        }
      />

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="whitespace-pre-line text-base leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

function TagBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span key={t} className="rounded border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/80">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">{title}</h3>
      <ul className="space-y-1.5 text-sm text-foreground/85">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span className="text-primary">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/80">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-primary">{value}</span>
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
      {children}
    </span>
  );
}
