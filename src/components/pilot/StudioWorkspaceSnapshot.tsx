/**
 * Member portal snapshot for the Studio page.
 *
 * Shows the signed-in member's own workspace numbers — use cases, scores,
 * portfolio and roadmap — measured from their own rows only (the same
 * per-member progress the milestone board uses). Shares the
 * ["pilot", "milestones"] query cache with PilotMilestoneBoard so both
 * surfaces stay in step without a second fetch.
 */

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, FileText, Gauge, KanbanSquare, Map } from "lucide-react";

import { getMyPilotMilestonesFn } from "@/lib/pilot/pilot.functions";
import type { PilotProgressSummary } from "@/lib/pilot/pilot.milestones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Tile = {
  label: string;
  value: (p: PilotProgressSummary) => number;
  to: string;
  hint: string;
  icon: typeof FileText;
};

const TILES: Tile[] = [
  {
    label: "My use cases",
    value: (p) => p.useCases,
    to: "/my-use-cases",
    hint: "Create, edit and export",
    icon: FileText,
  },
  {
    label: "Scored",
    value: (p) => p.scores,
    to: "/feasibility",
    hint: "Score my use cases",
    icon: Gauge,
  },
  {
    label: "In portfolio",
    value: (p) => p.portfolioItems,
    to: "/portfoliox",
    hint: "Prioritise the portfolio",
    icon: KanbanSquare,
  },
  {
    label: "On roadmap",
    value: (p) => p.roadmapItems,
    to: "/roadmap",
    hint: "Sequence delivery",
    icon: Map,
  },
];

export function StudioWorkspaceSnapshot({ enabled = true }: { enabled?: boolean }) {
  const load = useServerFn(getMyPilotMilestonesFn);
  const query = useQuery({
    queryKey: ["pilot", "milestones"],
    queryFn: () => load({ data: {} as never }),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const progress = query.data?.progress;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My workspace</CardTitle>
        <CardDescription>Only your own use cases, scores and roadmap appear here.</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading || !progress ? (
          <div className="grid grid-cols-2 gap-2">
            {TILES.map((t) => (
              <Skeleton key={t.label} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.label}
                  to={tile.to}
                  className="group rounded-md border border-border px-3 py-2 hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {tile.label}
                    </span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-foreground"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {tile.value(progress)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{tile.hint}</div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
