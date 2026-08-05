import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { RequirePlan } from "@/components/RequirePlan";
import { PageHeader, EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui-kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUseCaseXPro } from "@/hooks/usecasex-pro";
import { useAuthz } from "@/hooks/useAuthz";
import {
  DELIVERY_STAGE_LABELS,
  type DeliveryStage,
  type PortfolioEntry,
} from "@/lib/portfolio-model";
import {
  ROADMAP_BOUNDARY_NOTE,
  buildRoadmapItems,
  groupByPeriod,
  groupByStage,
  summarizeRoadmap,
  type RoadmapItem,
} from "@/lib/roadmap";
import { RoadmapBoard } from "@/components/roadmap/RoadmapBoard";
import { RoadmapItemDialog } from "@/components/roadmap/RoadmapItemDialog";

export const Route = createFileRoute("/_app/roadmap")({
  head: () => ({
    meta: [
      { title: "RoadmapX™ — Delivery sequence | UseCasesX™" },
      {
        name: "description",
        content:
          "Sequence prioritized AI use cases into a Now / Next / Later delivery roadmap with owners, milestones and dependencies.",
      },
      { property: "og:title", content: "RoadmapX™ — Delivery sequence" },
      {
        property: "og:description",
        content:
          "Turn portfolio decisions into a simple delivery sequence: Now, Next, Later, target quarters, owners and blockers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoadmapRoute,
});

function RoadmapRoute() {
  return (
    <RequirePlan plan="pro">
      <RoadmapSurface />
    </RequirePlan>
  );
}

function RoadmapSurface() {
  const store = useUseCaseXPro();
  const authz = useAuthz();
  const canManage = authz.can("portfolio.manage");

  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PortfolioEntry | null>(null);

  const portfolios = store.portfolios;
  const active = useMemo(
    () => portfolios.find((p) => p.id === portfolioId) ?? portfolios[0] ?? null,
    [portfolios, portfolioId],
  );

  const items = useMemo(() => buildRoadmapItems(active?.entries ?? []), [active]);
  const lanes = useMemo(() => groupByStage(items), [items]);
  const periods = useMemo(() => groupByPeriod(items), [items]);
  const summary = useMemo(() => summarizeRoadmap(items), [items]);

  const move = async (item: RoadmapItem, stage: DeliveryStage) => {
    if (!active) return;
    try {
      await store.updatePortfolioEntry(active.id, item.useCaseId, { deliveryStage: stage });
      toast.success(`${item.title} moved to ${DELIVERY_STAGE_LABELS[stage]}`);
    } catch {
      toast.error("Could not move this use case");
    }
  };

  if (store.isLoading) return <LoadingSkeleton />;
  if (store.error) return <ErrorState description="We could not load your roadmap." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="RoadmapX™"
        description="Turn portfolio decisions into a simple delivery sequence."
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Where RoadmapX stops</AlertTitle>
        <AlertDescription>{ROADMAP_BOUNDARY_NOTE}</AlertDescription>
      </Alert>

      {portfolios.length === 0 ? (
        <EmptyState
          title="No portfolios yet"
          description="Create a portfolio and shortlist use cases before sequencing delivery."
          action={
            <Button asChild>
              <Link to="/portfoliox">Go to PortfolioX</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56">
              <label htmlFor="roadmap-portfolio" className="text-sm font-medium">
                Portfolio
              </label>
              <Select
                value={active?.id ?? ""}
                onValueChange={(v) => setPortfolioId(v)}
              >
                <SelectTrigger id="roadmap-portfolio" className="mt-1">
                  <SelectValue placeholder="Select a portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" asChild>
              <Link to="/portfoliox">Manage portfolio</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="On the roadmap" value={summary.total} />
            <SummaryCard label="Overdue" value={summary.overdue} tone={summary.overdue > 0} />
            <SummaryCard
              label="Missing next action"
              value={summary.missingNextAction}
              tone={summary.missingNextAction > 0}
            />
            <SummaryCard
              label="Blocked or dependency risk"
              value={summary.blocked + summary.dependencyRisk}
              tone={summary.blocked + summary.dependencyRisk > 0}
            />
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No use cases to sequence"
              description="Add shortlisted use cases to this portfolio to build a delivery sequence."
              action={
                <Button asChild>
                  <Link to="/portfoliox">Add use cases</Link>
                </Button>
              }
            />
          ) : (
            <Tabs defaultValue="stages">
              <TabsList>
                <TabsTrigger value="stages">Now / Next / Later</TabsTrigger>
                <TabsTrigger value="periods">By quarter</TabsTrigger>
              </TabsList>

              <TabsContent value="stages" className="mt-4">
                <RoadmapBoard
                  lanes={lanes}
                  canManage={canManage}
                  onMove={move}
                  onEdit={(item) => setEditing(item.entry)}
                />
              </TabsContent>

              <TabsContent value="periods" className="mt-4 space-y-4">
                {periods.map((group) => (
                  <Card key={group.period}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{group.label}</span>
                        <Badge variant="secondary">{group.items.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <li
                            key={item.useCaseId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                          >
                            <div className="min-w-0">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {DELIVERY_STAGE_LABELS[item.stage]}
                                {item.entry.deliveryOwner ? ` · ${item.entry.deliveryOwner}` : ""}
                                {item.entry.milestone ? ` · ${item.entry.milestone}` : ""}
                              </p>
                            </div>
                            {canManage && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing(item.entry)}
                              >
                                Edit
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      <RoadmapItemDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        entry={editing}
        candidates={(active?.entries ?? []).filter((e) => e.useCaseId !== editing?.useCaseId)}
        saving={store.isSavingEntry}
        onSave={async (patch) => {
          if (!active || !editing) return;
          await store.updatePortfolioEntry(active.id, editing.useCaseId, patch);
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = false,
}: {
  label: string;
  value: number;
  tone?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold ${tone ? "text-destructive" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
