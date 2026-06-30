import type { ReactNode } from "react";

type UseCase = Record<string, any>;

interface CaseStudyProps {
  c: UseCase;
  industries: string[];
  capabilities: string[];
}

/**
 * Rich, narrative case-study presentation (Phase 2) that mirrors world-class
 * competitor storytelling: Problem → Approach → Evidence/Sources → Outcomes →
 * Citations. All content is synthesised from the existing use-case record so it
 * works for every use case without additional schema.
 */
export function CaseStudy({ c, industries, capabilities }: CaseStudyProps) {
  const problem = c.business_problem || c.problem;
  const approach = c.ai_solution_concept || c.solution;
  const dataRequired = c.data_required;
  const value = c.business_value || c.outcomes;
  const kpis: string[] = Array.isArray(c.kpis) ? c.kpis : [];
  const roiAreas: string[] = Array.isArray(c.roi_areas) ? c.roi_areas : [];
  const platforms: string[] = Array.isArray(c.recommended_platforms) ? c.recommended_platforms : [];

  const metrics: { label: string; value: string }[] = [];
  if (typeof c.impact_score === "number") metrics.push({ label: "Impact", value: `${c.impact_score}/10` });
  if (typeof c.effort_score === "number") metrics.push({ label: "Effort", value: `${c.effort_score}/10` });
  if (typeof c.risk_score === "number") metrics.push({ label: "Risk", value: `${c.risk_score}/10` });
  if (typeof c.maturity_score === "number") metrics.push({ label: "Maturity", value: `${c.maturity_score}/10` });
  if (c.value_potential) metrics.push({ label: "Value Potential", value: c.value_potential });
  if (c.time_to_value) metrics.push({ label: "Time to Value", value: c.time_to_value });

  // Sources / evidence basis — transparent provenance of the narrative.
  const sources: string[] = [];
  if (c.organization) sources.push(`Reference deployment profile · ${c.organization}`);
  if (c.region) sources.push(`Regional context · ${c.region}`);
  if (industries.length) sources.push(`Industry benchmarks · ${industries.join(", ")}`);
  if (capabilities.length) sources.push(`AI capability patterns · ${capabilities.slice(0, 3).join(", ")}`);
  if (platforms.length) sources.push(`AIgilityX module mapping · ${platforms.map((p) => p.toUpperCase()).join(", ")}`);

  const year = new Date().getFullYear();
  const citations: string[] = [
    `AIgilityX UseCasesX™ research synthesis, ${year}. AI-assisted analysis of ${industries[0] ?? "industry"} adoption patterns.`,
    `Methodology: opportunity scoring (impact, effort, risk, maturity) derived from the AIgilityX AI Use Case framework.`,
    `Illustrative figures and outcomes are AI-generated sample data intended to guide opportunity assessment — validate against your own data before investment.`,
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/50">
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-7 sm:px-8">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Case Study
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          How {c.organization || "leading organisations"} put this to work
        </h2>
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
                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
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

        <Block num="05" title="Citations & Methodology">
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