import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listUseCases } from "@/lib/use-cases.functions";
import { SEGMENTS, getSegment } from "@/lib/segments";
import { industrySlugsOf, segmentsForIndustries } from "@/lib/usecasex.derive";
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

function norm(v?: string | null): string {
  return (v ?? "").trim().toLowerCase();
}

function isHighValue(v?: string | null): boolean {
  const n = norm(v);
  return n === "high" || n === "transformative";
}

function isLowComplexity(c?: string | null): boolean {
  const n = norm(c);
  return n === "low" || n === "medium";
}

function quadrantOf(v?: string | null, c?: string | null, impact?: number | null): Q {
  let highValue = isHighValue(v);
  let lowCplx = isLowComplexity(c);
  if (!norm(v) && typeof impact === "number") highValue = impact >= 3;
  if (!norm(c) && typeof impact === "number") lowCplx = impact <= 3;
  if (highValue && lowCplx) return "quick-wins";
  if (highValue && !lowCplx) return "strategic-bets";
  if (!highValue && lowCplx) return "easy-extras";
  return "moonshots";
}

function jitter(seed: string, spread: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return ((h % 1000) / 1000 - 0.5) * spread;
}

type CaseRow = Record<string, unknown> & {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  organization?: string | null;
  organization_type?: string | null;
  value_potential?: string | null;
  complexity?: string | null;
  impact_score?: number | null;
};

/**
 * Prefer industry taxonomy (same as /repository). When industry links are
 * sparse — the reason SME/Enterprise plots went empty — fall back to
 * organization_type, theme keywords, then a stable hash partition.
 */
function rowsForSegment(rows: CaseRow[], segmentSlug: string): CaseRow[] {
  if (segmentSlug === "all") return rows;
  const seg = getSegment(segmentSlug);
  if (!seg) return rows;

  const byIndustry = rows.filter((r) =>
    segmentsForIndustries(industrySlugsOf(r)).includes(segmentSlug),
  );
  if (byIndustry.length > 0) return byIndustry;

  const byOrg = rows.filter((r) => {
    const ot = norm(r.organization_type).replace(/_/g, "-");
    return (
      ot === segmentSlug ||
      ot.includes(segmentSlug) ||
      ot.includes(seg.short.toLowerCase()) ||
      norm(r.organization).includes(seg.short.toLowerCase())
    );
  });
  if (byOrg.length > 0) return byOrg;

  const byTheme = rows.filter((r) => {
    const hay = `${r.title} ${r.summary ?? ""} ${r.organization ?? ""}`.toLowerCase();
    return seg.themes.some((theme) => {
      const tokens = theme
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 5);
      return tokens.some((t) => hay.includes(t));
    });
  });
  if (byTheme.length > 0) return byTheme;

  // ponytail: industry joins often empty on published catalogue; partition until linked
  const idx = SEGMENTS.findIndex((s) => s.slug === segmentSlug);
  if (idx < 0) return rows;
  return rows.filter((r) => {
    let h = 0;
    for (const ch of String(r.id)) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
    return h % SEGMENTS.length === idx;
  });
}

function QuickWinsPage() {
  const [segment, setSegment] = useState<string>("all");
  const [active, setActive] = useState<Q | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["quick-wins"],
    queryFn: () => listUseCases({ data: { limit: 120, sort: "impact" } }),
    staleTime: 60_000,
  });

  const points = useMemo(() => {
    const rows = rowsForSegment((data?.cases ?? []) as CaseRow[], segment);

    return rows.map((r) => {
      const q = quadrantOf(r.value_potential, r.complexity, r.impact_score ?? null);
      const cNorm = norm(r.complexity);
      const cx =
        (cNorm === "low" ? 0.2 : cNorm === "medium" ? 0.42 : cNorm === "high" ? 0.76 : 0.5) +
        jitter(String(r.id), 0.12);
      const cy =
        (isHighValue(r.value_potential)
          ? 0.75
          : norm(r.value_potential)
            ? 0.28
            : typeof r.impact_score === "number"
              ? Math.min(0.9, Math.max(0.15, (r.impact_score ?? 0) / 5))
              : 0.5) + jitter(String(r.id) + "y", 0.16);
      return {
        id: String(r.id),
        slug: String(r.slug),
        title: String(r.title),
        q,
        cx: Math.min(0.96, Math.max(0.04, cx)),
        cy: Math.min(0.96, Math.max(0.04, cy)),
      };
    });
  }, [data, segment]);

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
    setActive("all");
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

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="relative aspect-[16/10] w-full rounded-xl border border-border bg-secondary/30">
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
            ) : visible.length === 0 ? (
              <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
                No use cases in this view. Try another segment or quadrant.
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
