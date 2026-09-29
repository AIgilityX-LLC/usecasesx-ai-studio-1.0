import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listUseCases } from "@/lib/use-cases.functions";
import { SEGMENTS, getSegment } from "@/lib/segments";
import { PageHero } from "@/components/usecasex/PageHero";
import { CtaTriad } from "@/components/usecasex/CtaTriad";
import { MissingDataFallback } from "@/components/MissingDataFallback";
import { trackModuleEvent } from "@/lib/module-analytics";

export const Route = createFileRoute("/_app/quick-wins")({
  head: () => ({
    meta: [
      { title: "Quick Wins Matrix — UseCasesX™" },
      {
        name: "description",
        content:
          "Prioritize AI use cases on value vs complexity: Quick Wins, Strategic Bets, Easy Extras and Moonshots.",
      },
      { property: "og:title", content: "Quick Wins Matrix — UseCasesX™" },
      { property: "og:description", content: "Prioritize AI use cases on value vs complexity." },
    ],
  }),
  component: QuickWinsPage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Matrix failed to load" reason={(error as Error).message} />
  ),
});

type Q = "quick-wins" | "strategic-bets" | "easy-extras" | "moonshots";

const QUAD: Record<Q, { label: string; desc: string; cls: string }> = {
  "quick-wins": {
    label: "Quick Wins",
    desc: "High value · low complexity",
    cls: "text-emerald-500",
  },
  "strategic-bets": {
    label: "Strategic Bets",
    desc: "High value · high complexity",
    cls: "text-primary",
  },
  "easy-extras": {
    label: "Easy Extras",
    desc: "Lower value · low complexity",
    cls: "text-sky-500",
  },
  moonshots: { label: "Moonshots", desc: "Lower value · high complexity", cls: "text-rose-500" },
};

const valueScore = (v?: string | null) => (v === "High" ? 1 : 0);
const cplxLow = (c?: string | null) => c === "Low" || c === "Medium"; // High = high complexity

function quadrantOf(v?: string | null, c?: string | null): Q {
  const highValue = valueScore(v) === 1;
  const lowCplx = cplxLow(c);
  if (highValue && lowCplx) return "quick-wins";
  if (highValue && !lowCplx) return "strategic-bets";
  if (!highValue && lowCplx) return "easy-extras";
  return "moonshots";
}

// deterministic jitter from id so points don't overlap
function jitter(seed: string, spread: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return ((h % 1000) / 1000 - 0.5) * spread;
}

function QuickWinsPage() {
  const [segment, setSegment] = useState<string>("all");
  const [active, setActive] = useState<Q | "all">("all");

  const industries = segment === "all" ? [] : (getSegment(segment)?.industries ?? []);
  const { data, isLoading } = useQuery({
    queryKey: ["quick-wins", segment],
    queryFn: () => listUseCases({ data: { industries, limit: 120, sort: "impact" } }),
    staleTime: 60_000,
  });

  const points = useMemo(() => {
    const rows = (data?.cases ?? []) as Array<Record<string, unknown>>;
    return rows.map((r) => {
      const q = quadrantOf(r.value_potential as string, r.complexity as string);
      // x: complexity axis 0..1 (low→high); y: value axis 0..1 (low→high)
      const cx =
        (r.complexity === "Low" ? 0.2 : r.complexity === "Medium" ? 0.42 : 0.76) +
        jitter(String(r.id), 0.12);
      const cy =
        (valueScore(r.value_potential as string) === 1 ? 0.75 : 0.28) +
        jitter(String(r.id) + "y", 0.16);
      return {
        id: String(r.id),
        slug: String(r.slug),
        title: String(r.title),
        q,
        cx: Math.min(0.96, Math.max(0.04, cx)),
        cy: Math.min(0.96, Math.max(0.04, cy)),
      };
    });
  }, [data]);

  const counts = useMemo(() => {
    const c: Record<Q, number> = {
      "quick-wins": 0,
      "strategic-bets": 0,
      "easy-extras": 0,
      moonshots: 0,
    };
    points.forEach((p) => {
      c[p.q]++;
    });
    return c;
  }, [points]);

  const visible = active === "all" ? points : points.filter((p) => p.q === active);

  const setQuad = (q: Q | "all") => {
    setActive(q);
    void trackModuleEvent("quick_wins", "click", { interaction: "quadrant_filter", quadrant: q });
  };
  const setSeg = (s: string) => {
    setSegment(s);
    void trackModuleEvent("quick_wins", "click", { interaction: "segment_filter", segment: s });
  };

  return (
    <article>
      <PageHero
        tone="dark"
        eyebrow="Prioritization"
        title="Quick Wins Matrix"
        description="Plot AI use cases by business value against implementation complexity to find where to start."
        actions={
          <Link
            to="/repository"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Explore all use cases →
          </Link>
        }
      />

      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Segment
          </span>
          <button
            onClick={() => setSeg("all")}
            className={
              "rounded-md border px-3 py-1.5 text-xs font-semibold " +
              (segment === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary")
            }
          >
            All
          </button>
          {SEGMENTS.map((s) => (
            <button
              key={s.slug}
              onClick={() => setSeg(s.slug)}
              className={
                "rounded-md border px-3 py-1.5 text-xs font-semibold " +
                (segment === s.slug
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary")
              }
            >
              {s.short}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {(Object.keys(QUAD) as Q[]).map((q) => (
            <button
              key={q}
              onClick={() => setQuad(active === q ? "all" : q)}
              className={
                "rounded-xl border p-3 text-left transition " +
                (active === q
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-secondary")
              }
            >
              <div className={"text-sm font-bold " + QUAD[q].cls}>{QUAD[q].label}</div>
              <div className="text-[11px] text-muted-foreground">{QUAD[q].desc}</div>
              <div className="mt-1 text-lg font-black text-foreground">{counts[q]}</div>
            </button>
          ))}
        </div>

        {/* Plot */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="relative aspect-[16/10] w-full rounded-xl border border-border bg-secondary/30">
            {/* axes labels */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
            <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border" />
            <span className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
              Quick Wins
            </span>
            <span className="absolute right-3 top-2 text-[10px] font-bold uppercase tracking-widest text-primary">
              Strategic Bets
            </span>
            <span className="absolute left-3 bottom-2 text-[10px] font-bold uppercase tracking-widest text-sky-500">
              Easy Extras
            </span>
            <span className="absolute right-3 bottom-2 text-[10px] font-bold uppercase tracking-widest text-rose-500">
              Moonshots
            </span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest text-muted-foreground">
              Complexity →
            </span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] uppercase tracking-widest text-muted-foreground">
              Value →
            </span>

            {isLoading ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (
              visible.map((p) => (
                <Link
                  key={p.id}
                  to="/use-cases/$slug"
                  params={{ slug: p.slug }}
                  onClick={() =>
                    void trackModuleEvent("quick_wins", "click", {
                      interaction: "view_pattern",
                      use_case_id: p.id,
                      slug: p.slug,
                    })
                  }
                  title={p.title}
                  className={
                    "group absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition hover:h-4 hover:w-4 " +
                    (p.q === "quick-wins"
                      ? "bg-emerald-500"
                      : p.q === "strategic-bets"
                        ? "bg-primary"
                        : p.q === "easy-extras"
                          ? "bg-sky-500"
                          : "bg-rose-500")
                  }
                  style={{ left: `${p.cx * 100}%`, top: `${(1 - p.cy) * 100}%` }}
                >
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] font-semibold text-popover-foreground shadow group-hover:block">
                    {p.title}
                  </span>
                </Link>
              ))
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Each point is a published use case. Click a point to open its detail. Position reflects
            value potential and implementation complexity.
          </p>
        </div>
      </div>

      <CtaTriad />
    </article>
  );
}
