/**
 * Journey panel — the dashboard's single "where am I / what next" surface.
 *
 * Every number comes from the caller's own workspace via `getJourneySummaryFn`.
 * No placeholder metrics: an empty workspace shows guidance, not zeros dressed
 * up as progress.
 */

import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui-kit";
import { getJourneySummaryFn } from "@/lib/journey.functions";
import {
  isNewWorkspace,
  nextAction,
  stageProgress,
  type JourneyRoute,
  type JourneySummary,
} from "@/lib/journey";
import { PRODUCT_EVENTS, recordProductEvent } from "@/lib/telemetry";

type Card = { label: string; value: number; hint: string; to: JourneyRoute };

function cardsFor(s: JourneySummary): Card[] {
  return [
    {
      label: "Shortlisted",
      value: s.shortlisted,
      hint: "Saved from the repository",
      to: "/my-use-cases",
    },
    {
      label: "Open opportunities",
      value: s.opportunitiesOpen,
      hint: "Problems not yet converted",
      to: "/opportunities",
    },
    { label: "Draft use cases", value: s.drafts, hint: "In the Studio wizard", to: "/studio" },
    {
      label: "Completed use cases",
      value: s.completed,
      hint: "Design finished and versioned",
      to: "/my-use-cases",
    },
    { label: "Scored", value: s.scored, hint: "Scorecard results recorded", to: "/my-use-cases" },
    { label: "Portfolios", value: s.portfolios, hint: "Boards you own", to: "/boards" },
  ];
}

export function JourneyPanel() {
  const fetchSummary = useServerFn(getJourneySummaryFn);
  const query = useQuery({
    queryKey: ["journey-summary"],
    queryFn: () => fetchSummary(),
    staleTime: 30_000,
  });

  const summary = query.data as JourneySummary | undefined;
  const action = summary ? nextAction(summary) : null;
  const trackedStage = useRef<string | null>(null);

  // Funnel visibility: one event per stage per mount, fire-and-forget.
  useEffect(() => {
    if (!action || trackedStage.current === action.stage) return;
    trackedStage.current = action.stage;
    void recordProductEvent({
      event: PRODUCT_EVENTS.journeyStageViewed,
      properties: { stage: action.stage, nextAction: action.to },
    });
  }, [action]);

  if (query.isLoading) {
    return (
      <section
        aria-label="Your journey"
        className="h-40 animate-pulse rounded-2xl border border-border bg-card"
      />
    );
  }

  if (query.isError || !summary || !action) {
    return (
      <ErrorState
        title="Could not load your journey status"
        description="Your saved work is safe — this is just the summary."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const fresh = isNewWorkspace(summary);
  const stages = stageProgress(summary);

  return (
    <section aria-label="Your journey" className="space-y-5">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {fresh ? "New workspace" : "Next action"}
            </div>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              {fresh ? "Start your first AI opportunity" : action.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {fresh
                ? "Nothing has been captured here yet. Browse proven use cases, or record a business problem you already know about — both routes lead to the same Studio."
                : action.reason}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              onClick={() =>
                void recordProductEvent({
                  event: PRODUCT_EVENTS.journeyActionTaken,
                  properties: { stage: action.stage, to: action.to, variant: "primary" },
                })
              }
            >
              <Link to={fresh ? "/repository" : action.to}>
                {fresh ? "Browse the repository" : action.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              onClick={() =>
                void recordProductEvent({
                  event: PRODUCT_EVENTS.journeyActionTaken,
                  properties: { stage: action.stage, to: "/opportunities/new", variant: "second" },
                })
              }
            >
              <Link to="/opportunities/new">Capture a problem</Link>
            </Button>
          </div>
        </div>

        <ol className="mt-6 flex flex-wrap gap-2" aria-label="Journey progress">
          {stages.map((s) => (
            <li
              key={s.stage}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                s.reached
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {s.reached ? "✓ " : ""}
              {s.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cardsFor(summary).map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {c.label}
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">{c.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
