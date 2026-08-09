import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import saveAs from "file-saver";
import { Download, Info, Link2, Settings2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { RequirePlan } from "@/components/RequirePlan";
import { PageHeader, EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui-kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useExportPreferences } from "@/hooks/useExportPreferences";
import {
  DELIVERY_STAGE_LABELS,
  type DeliveryStage,
  type PortfolioEntry,
} from "@/lib/portfolio-model";
import {
  ROADMAP_BOUNDARY_NOTE,
  UNSCHEDULED_PERIOD,
  analyzeRoadmap,
  buildRoadmapItems,
  groupByPeriod,
  groupByStage,
  listPeriods,
  summarizeRoadmap,
  type RoadmapItem,
} from "@/lib/roadmap";
import {
  downloadRoadmap,
  roadmapExportFileName,
  type RoadmapExportFormat,
} from "@/lib/roadmap-export";
import { RoadmapAnalyticsPanel } from "@/components/roadmap/RoadmapAnalyticsPanel";
import { RoadmapAuditPanel } from "@/components/roadmap/RoadmapAuditPanel";
import { RoadmapBoard } from "@/components/roadmap/RoadmapBoard";
import { RoadmapExportSettingsDialog } from "@/components/roadmap/RoadmapExportSettingsDialog";
import { RoadmapItemDialog } from "@/components/roadmap/RoadmapItemDialog";

const roadmapSearchSchema = z.object({
  portfolio: fallback(z.string(), "").default(""),
  period: fallback(z.string(), "").default(""),
  tab: fallback(z.string(), "stages").default("stages"),
});


export const Route = createFileRoute("/_app/roadmap")({
  validateSearch: zodValidator(roadmapSearchSchema),
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
    <RequirePlan min="pro" feature="RoadmapX™ delivery sequencing">
      <RoadmapSurface />
    </RequirePlan>
  );
}

const ALL_PERIODS = "__all__";

function RoadmapSurface() {
  const store = useUseCaseXPro();
  const authz = useAuthz();
  const canManage = authz.can("portfolio.manage");

  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/roadmap" });
  const preferences = useExportPreferences("roadmap");

  const [editing, setEditing] = useState<PortfolioEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const period = search.period || ALL_PERIODS;
  const tab = search.tab || "stages";

  const setPeriod = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, period: value === ALL_PERIODS ? "" : value }) });
  const setPortfolioId = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, portfolio: value, period: "" }) });
  const setTab = (value: string) => navigate({ search: (prev) => ({ ...prev, tab: value }) });

  const portfolios = store.portfolios;
  const active = useMemo(
    () => portfolios.find((p) => p.id === search.portfolio) ?? portfolios[0] ?? null,
    [portfolios, search.portfolio],
  );

  const allItems = useMemo(() => buildRoadmapItems(active?.entries ?? []), [active]);
  const periodOptions = useMemo(() => listPeriods(allItems), [allItems]);
  const items = useMemo(
    () =>
      period === ALL_PERIODS
        ? allItems
        : allItems.filter((i) => (i.period ?? UNSCHEDULED_PERIOD) === period),
    [allItems, period],
  );
  const lanes = useMemo(() => groupByStage(items), [items]);
  const periods = useMemo(() => groupByPeriod(items), [items]);
  const summary = useMemo(() => summarizeRoadmap(items), [items]);
  const analytics = useMemo(() => analyzeRoadmap(items), [items]);
  const itemTitles = useMemo(
    () => new Map(items.map((item) => [item.useCaseId, item.title] as const)),
    [items],
  );

  const scopeLabel =
    period === ALL_PERIODS
      ? "All quarters"
      : period === UNSCHEDULED_PERIOD
        ? "No target period"
        : period;

  const exportRoadmap = (format: RoadmapExportFormat) => {
    if (items.length === 0) {
      toast.error("Nothing to export in the current view");
      return;
    }
    downloadRoadmap(
      items,
      format,
      {
        portfolioName: active?.name,
        period: period === ALL_PERIODS ? undefined : scopeLabel,
      },
      preferences.columns ?? undefined,
    );
    toast.success(`Exported ${items.length} roadmap items as ${format.toUpperCase()}`);
  };

  /** Streamed server-side export — reliable for large filtered sets. */
  const exportViaServer = async (format: RoadmapExportFormat) => {
    if (!active) return;
    setStreaming(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        toast.error("Sign in again to export");
        return;
      }
      const serverPeriod =
        period === ALL_PERIODS || period === UNSCHEDULED_PERIOD ? undefined : period;
      const response = await fetch("/api/public/usecasex/roadmap/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          portfolioId: active.id,
          format,
          period: serverPeriod,
          columns: preferences.columns ?? undefined,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      saveAs(blob, roadmapExportFileName(format, serverPeriod));
      toast.success(`Streamed ${format.toUpperCase()} export ready`);
    } catch {
      toast.error("Server export failed — try the direct download");
    } finally {
      setStreaming(false);
    }
  };

  const copyShareLink = async () => {
    try {
      const url = new URL(window.location.href);
      if (active) url.searchParams.set("portfolio", active.id);
      if (period !== ALL_PERIODS) url.searchParams.set("period", period);
      url.searchParams.set("tab", tab);
      await navigator.clipboard.writeText(url.toString());
      toast.success("Share link copied — it reopens this exact view");
    } catch {
      toast.error("Could not copy the link");
    }
  };


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
              <Select value={active?.id ?? ""} onValueChange={(v) => setPortfolioId(v)}>
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
            <div className="min-w-48">
              <label htmlFor="roadmap-period" className="text-sm font-medium">
                Quarter
              </label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="roadmap-period" className="mt-1">
                  <SelectValue placeholder="All quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PERIODS}>All quarters</SelectItem>
                  {periodOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === UNSCHEDULED_PERIOD ? "No target period" : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={items.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {scopeLabel} · {items.length} items
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => exportRoadmap("csv")}>
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportRoadmap("json")}>
                  Download JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

              <TabsContent value="stages" className="mt-4 space-y-4">
                <RoadmapAnalyticsPanel analytics={analytics} scopeLabel={scopeLabel} />
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
        allEntries={active?.entries ?? []}
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
