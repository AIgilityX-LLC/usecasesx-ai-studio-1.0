import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { EvidenceDrawer, type EvidenceSource } from "./EvidenceDrawer";

type UseCase = Record<string, any>;

interface Entry { slug: string; name: string; }

interface CaseStudyProps {
  c: UseCase;
  industries: string[];
  capabilities: string[];
  /** Slug+name entries enable deep-links into the filtered catalog. */
  industryEntries?: Entry[];
  capabilityEntries?: Entry[];
  objectiveEntries?: Entry[];
}

/**
 * Rich, narrative case-study presentation (Phase 2) that mirrors world-class
 * competitor storytelling: Problem → Approach → Evidence/Sources → Outcomes →
 * Citations. All content is synthesised from the existing use-case record so it
 * works for every use case without additional schema.
 */
export function CaseStudy({
  c,
  industries,
  capabilities,
  industryEntries = [],
  capabilityEntries = [],
  objectiveEntries = [],
}: CaseStudyProps) {
  const problem = c.business_problem || c.problem;
  const approach = c.ai_solution_concept || c.solution;
  const dataRequired = c.data_required;
  const value = c.business_value || c.outcomes;
  const kpis: string[] = Array.isArray(c.kpis) ? c.kpis : [];
  const roiAreas: string[] = Array.isArray(c.roi_areas) ? c.roi_areas : [];
  const platforms: string[] = Array.isArray(c.recommended_platforms) ? c.recommended_platforms : [];

  // ---- Structured outcome metrics (sortable visualization) ----
  const [sortDir, setSortDir] = useState<"none" | "desc" | "asc">("none");
  const outcomeMetrics = useMemo(() => buildOutcomeMetrics(c), [c]);
  const sortedOutcomes = useMemo(() => {
    if (sortDir === "none") return outcomeMetrics;
    const arr = [...outcomeMetrics];
    arr.sort((a, b) => (sortDir === "desc" ? b.score - a.score : a.score - b.score));
    return arr;
  }, [outcomeMetrics, sortDir]);

  const metrics: { label: string; value: string }[] = [];
  if (typeof c.impact_score === "number") metrics.push({ label: "Impact", value: `${c.impact_score}/10` });
  if (typeof c.effort_score === "number") metrics.push({ label: "Effort", value: `${c.effort_score}/10` });
  if (typeof c.risk_score === "number") metrics.push({ label: "Risk", value: `${c.risk_score}/10` });
  if (typeof c.maturity_score === "number") metrics.push({ label: "Maturity", value: `${c.maturity_score}/10` });
  if (c.value_potential) metrics.push({ label: "Value Potential", value: c.value_potential });
  if (c.time_to_value) metrics.push({ label: "Time to Value", value: c.time_to_value });

  // Sources / evidence basis — transparent provenance of the narrative.
  const links: { label: string; url: string; kind?: string }[] = Array.isArray(c.use_case_links)
    ? c.use_case_links.filter((l: any) => l?.url)
    : [];
  const sources: EvidenceSource[] = [];
  if (c.organization)
    sources.push({ label: "Reference deployment profile", detail: c.organization, kind: "Profile" });
  if (c.region) sources.push({ label: "Regional context", detail: c.region, kind: "Context" });
  for (const ind of industryEntries)
    sources.push({ label: "Industry benchmark", detail: ind.name, kind: "Benchmark", link: { facet: "industries", slug: ind.slug } });
  for (const cap of capabilityEntries.slice(0, 3))
    sources.push({ label: "AI capability pattern", detail: cap.name, kind: "Pattern", link: { facet: "capabilities", slug: cap.slug } });
  if (platforms.length)
    sources.push({ label: "AIgilityX module mapping", detail: platforms.map((p) => p.toUpperCase()).join(", "), kind: "Mapping" });
  for (const l of links)
    sources.push({ label: l.label || l.url, url: l.url, detail: l.url, kind: l.kind || "Reference" });

  const year = new Date().getFullYear();
  const citations: string[] = [
    `AIgilityX UseCasesX™ research synthesis, ${year}. AI-assisted analysis of ${industries[0] ?? "industry"} adoption patterns.`,
    `Methodology: opportunity scoring (impact, effort, risk, maturity) derived from the AIgilityX AI Use Case framework.`,
    `Illustrative figures and outcomes are AI-generated sample data intended to guide opportunity assessment — validate against your own data before investment.`,
  ];

  // Deep-linkable tags
  const tagEntries: { slug: string; name: string; facet: "capabilities" | "objectives" }[] = [
    ...capabilityEntries.map((e) => ({ ...e, facet: "capabilities" as const })),
    ...objectiveEntries.map((e) => ({ ...e, facet: "objectives" as const })),
  ].slice(0, 10);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/50">
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-7 sm:px-8">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Case Study
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How {c.organization || "leading organisations"} put this to work
          </h2>
          <EvidenceDrawer title={c.title ?? "this use case"} sources={sources} citations={citations} />
        </div>
        {metrics.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
                <div className="text-lg font-bold text-foreground">{m.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8 px-6 py-7 sm:px-8">
        {outcomeMetrics.length > 0 && (
          <Block num="00" title="Structured Outcomes">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Value, complexity, risk and time-to-value scored on a comparable 0–100 scale.
              </p>
              <button
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : d === "asc" ? "none" : "desc"))}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary"
              >
                <ArrowUpDown className="h-3 w-3" />
                {sortDir === "desc" ? "High → Low" : sortDir === "asc" ? "Low → High" : "Sort"}
              </button>
            </div>
            <div className="space-y-3">
              {sortedOutcomes.map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{m.label}</span>
                    <span className="font-mono text-muted-foreground">{m.display}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={"h-full rounded-full " + m.color}
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {problem && (
          <Block num="01" title="The Problem">
            <p className="whitespace-pre-line text-muted-foreground">{problem}</p>
          </Block>
        )}

        {(approach || dataRequired) && (
          <Block num="02" title="The Approach">
            {approach && <p className="whitespace-pre-line text-muted-foreground">{approach}</p>}
            {dataRequired && (
              <div className="mt-4 rounded-lg border border-border bg-background/50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Data foundation</div>
                <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{dataRequired}</p>
              </div>
            )}
          </Block>
        )}

        {(sources.length > 0) && (
          <Block num="03" title="Evidence & Sources">
            <p className="text-sm text-muted-foreground">
              This narrative is grounded in the following evidence and reference signals:
            </p>
            <ul className="mt-3 space-y-2">
              {sources.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="flex-1">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer noopener" className="font-medium text-foreground hover:text-primary">
                        {s.label}
                      </a>
                    ) : (
                      <span className="font-medium text-foreground">{s.label}</span>
                    )}
                    {s.detail && <span> · {s.detail}</span>}
                    {s.link && (
                      <Link
                        to="/repository"
                        search={{ [s.link.facet]: [s.link.slug] } as never}
                        className="ml-2 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                      >
                        explore →
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <EvidenceDrawer
                title={c.title ?? "this use case"}
                sources={sources}
                citations={citations}
                trigger={
                  <button className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">
                    Open full evidence &amp; citations drawer →
                  </button>
                }
              />
            </div>
          </Block>
        )}

        {(value || kpis.length > 0 || roiAreas.length > 0) && (
          <Block num="04" title="Outcomes">
            {value && <p className="whitespace-pre-line text-muted-foreground">{value}</p>}
            {(kpis.length > 0 || roiAreas.length > 0) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {kpis.length > 0 && (
                  <div className="rounded-lg border border-border bg-background/50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Key KPIs</div>
                    <ul className="mt-2 space-y-1.5">
                      {kpis.map((k, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="text-primary">↗</span>
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {roiAreas.length > 0 && (
                  <div className="rounded-lg border border-border bg-background/50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary">ROI areas</div>
                    <ul className="mt-2 space-y-1.5">
                      {roiAreas.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="text-primary">$</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Block>
        )}

        {tagEntries.length > 0 && (
          <Block num="05" title="Explore Related">
            <p className="text-sm text-muted-foreground">
              Jump straight to the filtered catalog for any of these tags:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tagEntries.map((t) => (
                <Link
                  key={`${t.facet}:${t.slug}`}
                  to="/repository"
                  search={{ [t.facet]: [t.slug] } as never}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          </Block>
        )}

        <Block num="06" title="Citations & Methodology">
          <ol className="space-y-2">
            {citations.map((cit, i) => (
              <li key={i} className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-mono font-bold text-primary">[{i + 1}]</span>
                <span>{cit}</span>
              </li>
            ))}
          </ol>
        </Block>
      </div>
    </section>
  );
}

// ---- Outcome metric scoring helpers ----
interface OutcomeMetric { label: string; display: string; score: number; color: string; }

function buildOutcomeMetrics(c: UseCase): OutcomeMetric[] {
  const out: OutcomeMetric[] = [];
  const lev = (v: string | undefined, map: Record<string, number>) =>
    v ? map[v] : undefined;

  const valueScore = lev(c.value_potential, { Low: 33, Medium: 66, High: 100 });
  if (valueScore != null) out.push({ label: "Value Potential", display: c.value_potential, score: valueScore, color: "bg-emerald-500" });

  const cplxScore = lev(c.complexity, { Low: 33, Medium: 66, High: 100 });
  if (cplxScore != null) out.push({ label: "Complexity", display: c.complexity, score: cplxScore, color: "bg-amber-500" });

  const riskScore = lev(c.risk_level, { Low: 25, Medium: 50, High: 75, Critical: 100 });
  if (riskScore != null) out.push({ label: "Risk Level", display: c.risk_level, score: riskScore, color: "bg-rose-500" });

  const ttvScore = lev(c.time_to_value, { Short: 33, Medium: 66, Long: 100 });
  if (ttvScore != null) out.push({ label: "Time to Value", display: c.time_to_value, score: ttvScore, color: "bg-sky-500" });

  return out;
}

function Block({ num, title, children }: { num: string; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-xs font-bold text-primary/70">{num}</span>
        <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
      </div>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
    </div>
  );
}