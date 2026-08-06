/**
 * Now / Next / Later delivery board.
 *
 * Movement uses explicit, keyboard-accessible controls rather than drag and
 * drop so the sequence can be changed reliably on any device.
 */

import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Compass, Pencil, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DELIVERY_STAGE_DESCRIPTIONS,
  DELIVERY_STAGE_LABELS,
  type DeliveryStage,
} from "@/lib/portfolio-model";
import {
  ROADMAP_FLAG_LABELS,
  adjacentStage,
  type RoadmapFlag,
  type RoadmapItem,
  type RoadmapLane,
} from "@/lib/roadmap";

function ItemCard({
  item,
  canManage,
  portfolioId,
  onMove,
  onEdit,
}: {
  item: RoadmapItem;
  canManage: boolean;
  portfolioId: string;
  onMove: (item: RoadmapItem, stage: DeliveryStage) => void;
  onEdit: (item: RoadmapItem) => void;
}) {
  const prev = adjacentStage(item.stage, -1);
  const next = adjacentStage(item.stage, 1);
  const isAttention = (f: RoadmapFlag) => f === "overdue" || f === "blocked";

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {item.entry.useCaseSlug ? (
            <Link
              to="/use-cases/$slug"
              params={{ slug: item.entry.useCaseSlug }}
              className="font-medium underline-offset-4 hover:underline"
            >
              {item.title}
            </Link>
          ) : (
            <span className="font-medium">{item.title}</span>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {item.period ?? "No target period"}
            {item.entry.deliveryOwner ? ` · ${item.entry.deliveryOwner}` : ""}
          </p>
        </div>
        {canManage && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Edit roadmap details for ${item.title}`}
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {item.entry.milestone && (
        <p className="mt-2 text-xs text-muted-foreground">Milestone: {item.entry.milestone}</p>
      )}
      {(item.entry.plannedStartDate || item.entry.plannedEndDate) && (
        <p className="text-xs text-muted-foreground">
          {item.entry.plannedStartDate ?? "—"} → {item.entry.plannedEndDate ?? "—"}
        </p>
      )}
      {item.entry.nextAction && <p className="mt-2 text-sm">Next: {item.entry.nextAction}</p>}
      {item.dependencies.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Depends on: {item.dependencies.map((d) => d.title).join(", ")}
        </p>
      )}

      {item.flags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {item.flags.map((flag) => (
            <li key={flag}>
              <Badge
                variant={isAttention(flag) ? "destructive" : "secondary"}
                className="gap-1 text-[11px]"
              >
                {isAttention(flag) && <AlertTriangle className="h-3 w-3" />}
                {ROADMAP_FLAG_LABELS[flag]}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link
            to="/studio/use-case/$id"
            params={{ id: item.useCaseId }}
            search={{ from: "roadmap", stage: item.stage, portfolioId }}
            aria-label={`Open ${item.title} in the AI Use Case Studio`}
          >
            <Wrench className="mr-1 h-3.5 w-3.5" />
            Studio
          </Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link
            to="/studio/use-case/$id/advisorx"
            params={{ id: item.useCaseId }}
            search={{ from: "roadmap", stage: item.stage, portfolioId }}
            aria-label={`Open AdvisorX guidance for ${item.title}`}
          >
            <Compass className="mr-1 h-3.5 w-3.5" />
            Advisory
          </Link>
        </Button>
      </div>

      {canManage && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!prev}
            aria-label={
              prev ? `Move ${item.title} to ${DELIVERY_STAGE_LABELS[prev]}` : "Cannot move earlier"
            }
            onClick={() => prev && onMove(item, prev)}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            {prev ? DELIVERY_STAGE_LABELS[prev] : "Earlier"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!next}
            aria-label={
              next ? `Move ${item.title} to ${DELIVERY_STAGE_LABELS[next]}` : "Cannot move later"
            }
            onClick={() => next && onMove(item, next)}
          >
            {next ? DELIVERY_STAGE_LABELS[next] : "Later"}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}

export function RoadmapBoard({
  lanes,
  canManage,
  portfolioId,
  onMove,
  onEdit,
}: {
  lanes: RoadmapLane[];
  canManage: boolean;
  portfolioId: string;
  onMove: (item: RoadmapItem, stage: DeliveryStage) => void;
  onEdit: (item: RoadmapItem) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {lanes.map((lane) => (
        <Card key={lane.stage} className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>{lane.label}</span>
              <Badge variant="secondary">{lane.items.length}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {DELIVERY_STAGE_DESCRIPTIONS[lane.stage]}
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            {lane.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <ul className="space-y-3">
                {lane.items.map((item) => (
                  <ItemCard
                    key={item.useCaseId}
                    item={item}
                    canManage={canManage}
                    portfolioId={portfolioId}
                    onMove={onMove}
                    onEdit={onEdit}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
