import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Map as MapIcon, Table2, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { getOpportunityMapFn } from "@/lib/opportunity-map.functions";
import {
  activeFilterCount,
  applyMapFilters,
  assessReadiness,
  emptyMapFilters,
  formatValue,
  INTENSITY_BAND_LABELS,
  INTENSITY_EXPLANATION,
  ROW_AXIS_LABELS,
  UNASSIGNED,
  UNASSIGNED_LABEL,
  type MapFilters,
  type RowAxis,
} from "@/lib/opportunity-map";
import { downloadOpportunityMap, type MapExportFormat } from "@/lib/opportunity-map-export";
import { OPPORTUNITY_STATUSES, STATUS_META, URGENCIES, URGENCY_LABELS } from "@/lib/opportunities";
import { OpportunityMapGrid } from "@/components/opportunities/OpportunityMapGrid";
import { TaxonomySetupChecklist } from "@/components/opportunities/TaxonomySetupChecklist";
import {
  PageHeader,
  ErrorState,
  EmptyState,
  LoadingSkeleton,
  StatusChip,
} from "@/components/ui-kit";
import { RESERVED_MAP_OVERLAYS } from "@/lib/feature-flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app/opportunity-map")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "AI Opportunity Map | AIgilityX UseCasesX" },
      {
        name: "description",
        content:
          "See where captured AI opportunities concentrate across your organization and strategic value themes, and drill into the records behind every cell.",
      },
      { property: "og:title", content: "AI Opportunity Map | AIgilityX UseCasesX" },
      {
        property: "og:description",
        content:
          "Plot captured AI opportunities by organization unit or business function against strategic value themes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OpportunityMapPage,
  errorComponent: ({ error }) => (
    <div className="p-6">
      <ErrorState title="Opportunity Map unavailable" description={error.message} />
    </div>
  ),
});

type FilterKey =
  | "orgUnitIds"
  | "businessFunctions"
  | "themeIds"
  | "statuses"
  | "urgencies"
  | "owners";

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.key);
          return (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              className="h-7 text-xs"
              onClick={() => onToggle(option.key)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}

function OpportunityMapPage() {
  const fetchMap = useServerFn(getOpportunityMapFn);
  // The map is an authenticated read: without a resolved session the bearer
  // attacher has no token and the server fn rejects with 401.
  const session = useSupabaseSession();
  const query = useQuery({
    queryKey: ["opportunity-map"],
    queryFn: () => fetchMap(),
    enabled: Boolean(session),
    staleTime: 60_000,
  });

  const [axis, setAxis] = useState<RowAxis>("orgUnit");
  const [view, setView] = useState<"map" | "table">("map");
  const [filters, setFilters] = useState<MapFilters>(emptyMapFilters);

  const records = useMemo(() => query.data?.records ?? [], [query.data]);
  const filtered = useMemo(() => applyMapFilters(records, filters), [records, filters]);
  const readiness = useMemo(() => assessReadiness(records, axis), [records, axis]);

  const options = useMemo(() => {
    const unique = (pairs: [string, string][]): { key: string; label: string }[] => {
      const map = new Map(pairs);
      return [...map.entries()]
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) =>
          a.key === UNASSIGNED ? 1 : b.key === UNASSIGNED ? -1 : a.label.localeCompare(b.label),
        );
    };
    return {
      orgUnits: unique(
        records.map((r) => [r.orgUnitId ?? UNASSIGNED, r.orgUnitName || UNASSIGNED_LABEL]),
      ),
      functions: unique(
        records.map((r) => [
          r.businessFunction || UNASSIGNED,
          r.businessFunction || UNASSIGNED_LABEL,
        ]),
      ),
      themes: unique(
        records.map((r) => [
          r.strategicThemeId ?? UNASSIGNED,
          r.strategicThemeName || UNASSIGNED_LABEL,
        ]),
      ),
      owners: unique(records.map((r) => [r.ownerName || UNASSIGNED, r.ownerName || "Unassigned"])),
    };
  }, [records]);

  const toggle = (key: FilterKey, value: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));

  const setupCounts = useMemo(() => {
    const setup = query.data?.setup;
    const classified = records.filter(
      (r) => (r.orgUnitId || r.businessFunction.trim()) && r.strategicThemeId,
    ).length;
    return {
      orgUnits: setup?.orgUnits ?? 0,
      strategicThemes: setup?.strategicThemes ?? 0,
      valueThemes: setup?.valueThemes ?? 0,
      processes: setup?.processes ?? 0,
      opportunities: records.length,
      classifiedOpportunities: classified,
    };
  }, [query.data, records]);

  const exportMap = (format: MapExportFormat) => {
    try {
      downloadOpportunityMap(filtered, axis, format);
      toast.success("Export ready", { description: `${filtered.length} records in view.` });
    } catch (error) {
      toast.error("Export failed", { description: (error as Error).message });
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="AI Opportunity Map"
        description="Where captured opportunities concentrate across your organization and the strategic value themes they serve."
        actions={
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={filtered.length === 0}>
                  <Download className="mr-1.5 size-4" aria-hidden />
                  Export map
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Exports the {filtered.length} records in view</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => exportMap("matrix-csv")}>
                  Grid CSV — {ROW_AXIS_LABELS[axis].toLowerCase()} × value theme
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportMap("records-csv")}>
                  Records CSV — one row per opportunity
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportMap("json")}>
                  JSON — cells, records and methodology
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild variant="outline" size="sm">
              <Link to="/opportunities">Manage opportunities</Link>
            </Button>
          </div>
        }
      />

      {query.isLoading && <LoadingSkeleton />}

      {query.isError && (
        <ErrorState
          title="Could not load the map"
          description={(query.error as Error).message}
          onRetry={() => query.refetch()}
        />
      )}

      {query.isSuccess && !readiness.hasRecords && (
        <>
          <EmptyState
            title="No opportunities captured yet"
            description="The map plots real captured records only. Capture your first opportunity and classify it against an organization unit and a strategic value theme."
            action={
              <Button asChild size="sm">
                <Link to="/opportunities/new">Capture an opportunity</Link>
              </Button>
            }
          />
          <TaxonomySetupChecklist counts={setupCounts} />
        </>
      )}

      {query.isSuccess && readiness.hasRecords && !readiness.ready && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification needed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {records.length} opportunit{records.length === 1 ? "y is" : "ies are"} captured, but
                the map needs both an organizational dimension and a strategic value theme on at
                least some of them. Currently classified: {readiness.classifiedRows}{" "}
                {ROW_AXIS_LABELS[axis].toLowerCase()} value(s), {readiness.classifiedColumns} value
                theme(s).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/account/organization">Set up organization &amp; taxonomy</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/opportunities">Classify opportunities</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <TaxonomySetupChecklist counts={setupCounts} />
        </>
      )}

      {query.isSuccess && readiness.hasRecords && (
        <>
          {query.data?.truncated && (
            <p
              role="status"
              className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
            >
              Showing the {records.length} most recently updated opportunities of{" "}
              {query.data.totalCount}. Narrow the scope in Opportunities to map an older cohort.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={axis} onValueChange={(v) => setAxis(v as RowAxis)}>
              <TabsList>
                <TabsTrigger value="orgUnit">By organization unit</TabsTrigger>
                <TabsTrigger value="businessFunction">By business function</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={view} onValueChange={(v) => setView(v as "map" | "table")}>
              <TabsList>
                <TabsTrigger value="map">
                  <MapIcon className="mr-1.5 size-4" aria-hidden /> Map
                </TabsTrigger>
                <TabsTrigger value="table">
                  <Table2 className="mr-1.5 size-4" aria-hidden /> Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                Filters
                {activeFilterCount(filters) > 0 && (
                  <>
                    <Badge variant="secondary">{activeFilterCount(filters)} active</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setFilters(emptyMapFilters())}
                    >
                      Clear all
                    </Button>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="map-search"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Search titles
                </label>
                <Input
                  id="map-search"
                  value={filters.search}
                  placeholder="Filter by opportunity title"
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </div>
              <FilterGroup
                label="Organization unit"
                options={options.orgUnits}
                selected={filters.orgUnitIds}
                onToggle={(key) => toggle("orgUnitIds", key)}
              />
              <FilterGroup
                label="Business function"
                options={options.functions}
                selected={filters.businessFunctions}
                onToggle={(key) => toggle("businessFunctions", key)}
              />
              <FilterGroup
                label="Strategic value theme"
                options={options.themes}
                selected={filters.themeIds}
                onToggle={(key) => toggle("themeIds", key)}
              />
              <FilterGroup
                label="Owner"
                options={options.owners}
                selected={filters.owners}
                onToggle={(key) => toggle("owners", key)}
              />
              <FilterGroup
                label="Lifecycle status"
                options={OPPORTUNITY_STATUSES.map((status) => ({
                  key: status,
                  label: STATUS_META[status]?.label ?? status,
                }))}
                selected={filters.statuses}
                onToggle={(key) => toggle("statuses", key)}
              />
              <FilterGroup
                label="Urgency"
                options={URGENCIES.map((urgency) => ({
                  key: urgency,
                  label: URGENCY_LABELS[urgency],
                }))}
                selected={filters.urgencies}
                onToggle={(key) => toggle("urgencies", key)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {filtered.length} of {records.length} records in view
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filtered.length === 0 ? (
                <EmptyState
                  title="No records match these filters"
                  description="Relax a filter to bring records back into the map."
                  action={
                    <Button size="sm" onClick={() => setFilters(emptyMapFilters())}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <OpportunityMapGrid records={filtered} axis={axis} view={view} />
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">Intensity</span>
                {(["low", "moderate", "high", "highest"] as const).map((band) => (
                  <StatusChip key={band} tone={band === "highest" ? "accent" : "info"}>
                    {INTENSITY_BAND_LABELS[band]}
                  </StatusChip>
                ))}
              </div>

              <p className="flex gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{INTENSITY_EXPLANATION}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reserved for Enterprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                These overlays are designed into the model but are not live in Pro Founding Access.
              </p>
              <ul className="space-y-1">
                {RESERVED_MAP_OVERLAYS.map((overlay) => (
                  <li key={overlay.key} className="flex flex-wrap items-center gap-2">
                    <StatusChip tone="neutral">Not live</StatusChip>
                    <span className="font-medium text-foreground">{overlay.label}</span>
                    <span>— {overlay.description}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
