import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listUseCases } from "@/lib/use-cases.functions";
import { SEGMENTS, getSegment, sectorsForSegment } from "@/lib/segments";
import { UseCaseCard, type UseCaseCardData } from "@/components/UseCaseCard";
import { PageHero } from "@/components/usecasex/PageHero";
import { CtaTriad } from "@/components/usecasex/CtaTriad";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { trackModuleEvent } from "@/lib/module-analytics";

export const Route = createFileRoute("/_app/discover")({
  head: () => ({
    meta: [
      { title: "Use Case Discovery Wizard — UseCasesX™" },
      { name: "description", content: "Answer a few questions and get a ranked shortlist of AI use cases for your segment, sector, maturity and budget." },
      { property: "og:title", content: "Use Case Discovery Wizard — UseCasesX™" },
      { property: "og:description", content: "Get a ranked shortlist of AI use cases for your organization." },
    ],
  }),
  component: DiscoverPage,
});

type Answers = {
  segment: string;
  sector: string;
  maturity: string;
  budget: string;
};

const MATURITY = [
  { v: "concept", label: "Just exploring" },
  { v: "prototype", label: "Early experiments" },
  { v: "pilot", label: "Running pilots" },
  { v: "production", label: "Scaling in production" },
];
const BUDGET = [
  { v: "low", label: "Lean — quick wins only" },
  { v: "medium", label: "Moderate — balanced" },
  { v: "high", label: "Strategic — transformation" },
];

function DiscoverPage() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ segment: "", sector: "", maturity: "", budget: "" });
  const [submitted, setSubmitted] = useState(false);

  const seg = getSegment(a.segment);
  const sectors = seg ? sectorsForSegment(seg) : [];

  const industries = a.sector ? [a.sector] : seg?.industries ?? [];
  const complexity = a.budget === "low" ? ["Low"] : a.budget === "medium" ? ["Low", "Medium"] : [];

  const { data, isLoading } = useQuery({
    queryKey: ["discover", industries, a.maturity, complexity],
    queryFn: () =>
      listUseCases({
        data: {
          industries,
          maturity: a.maturity ? [a.maturity] : [],
          complexity,
          sort: "impact",
          limit: 18,
        },
      }),
    enabled: submitted,
    staleTime: 60_000,
  });

  const cases = (data?.cases ?? []) as UseCaseCardData[];

  const steps = [
    {
      key: "segment", title: "Which best describes your organization?",
      options: SEGMENTS.map((s) => ({ v: s.slug, label: s.name })),
    },
    {
      key: "sector", title: "Which sector are you in?",
      options: [{ v: "", label: "All sectors in my segment" }, ...sectors.map((s) => ({ v: s.slug, label: s.name }))],
    },
    { key: "maturity", title: "What's your current AI maturity?", options: MATURITY },
    { key: "budget", title: "What's your appetite for complexity & budget?", options: BUDGET },
  ] as const;

  const cur = steps[step];

  const pick = (v: string) => {
    setA((prev) => ({ ...prev, [cur.key]: v }));
    void trackModuleEvent("discover", "click", { interaction: "answer", step: cur.key, value: v });
    if (step < steps.length - 1) setStep(step + 1);
    else { setSubmitted(true); void trackModuleEvent("discover", "click", { interaction: "results" }); }
  };

  const reset = () => { setStep(0); setA({ segment: "", sector: "", maturity: "", budget: "" }); setSubmitted(false); };

  return (
    <article>
      <PageHero
        tone="dark"
        eyebrow="Discovery"
        title="Use Case Discovery Wizard"
        description="Answer four quick questions and we'll shortlist high-value AI use cases for your context."
      />

      <div className="mx-auto max-w-[900px] px-6 py-10">
        {!submitted ? (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.key} className={"h-1.5 flex-1 rounded-full " + (i <= step ? "bg-primary" : "bg-border")} />
              ))}
            </div>
            <div className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Step {step + 1} of {steps.length}</div>
            <h2 className="mt-4 text-2xl font-bold text-foreground">{cur.title}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {cur.options.map((o) => (
                <button
                  key={o.v + o.label}
                  onClick={() => pick(o.v)}
                  className="rounded-xl border border-border bg-background p-4 text-left text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
                >
                  {o.label}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="mt-6 text-sm font-semibold text-muted-foreground hover:text-foreground">← Back</button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Your shortlist</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {seg?.name}{a.sector ? ` · ${sectors.find((s) => s.slug === a.sector)?.name ?? ""}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary">Start over</button>
                <Link to="/repository" className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">Open repository</Link>
              </div>
            </div>
            {isLoading ? (
              <div className="mt-6"><CardSkeleton /></div>
            ) : cases.length === 0 ? (
              <p className="mt-6 text-muted-foreground">No exact matches — try broadening your answers or explore the full repository.</p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {cases.map((c) => (<UseCaseCard key={c.id} c={c} showCompare />))}
              </div>
            )}
          </div>
        )}
      </div>

      <CtaTriad />
    </article>
  );
}
