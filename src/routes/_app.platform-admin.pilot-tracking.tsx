/**
 * Administration → Pilot tracking.
 *
 * Two read-only views over real pilot data: incoming leads (volume, approvals,
 * sector and role mix) and the cohort's progress through the six pilot steps.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getPilotCohortProgressFn, listPilotApplicationsFn } from "@/lib/pilot/pilot.functions";
import { PilotLeadTracking } from "@/components/pilot/PilotLeadTracking";
import { PilotCohortProgressBoard } from "@/components/pilot/PilotCohortProgressBoard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "leads" | "cohort";

export const Route = createFileRoute("/_app/platform-admin/pilot-tracking")({
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => ({
    tab: search.tab === "cohort" ? "cohort" : "leads",
  }),
  head: () => privateHead("Pilot tracking"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES}>
      <PilotTracking />
    </RequireRoles>
  ),
});

function LoadError({ what }: { what: string }) {
  return (
    <EmptyState
      title={`Could not load ${what}`}
      description="Refresh the page, or check that your account still holds a platform admin role."
    />
  );
}

function PilotTracking() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const listApplications = useServerFn(listPilotApplicationsFn);
  const getProgress = useServerFn(getPilotCohortProgressFn);

  const leads = useQuery({
    queryKey: ["admin", "pilot-tracking", "leads"],
    queryFn: () => listApplications(),
    refetchInterval: 60_000,
  });
  const cohort = useQuery({
    queryKey: ["admin", "pilot-tracking", "cohort"],
    queryFn: () => getProgress(),
    enabled: tab === "cohort",
    refetchInterval: 60_000,
  });

  const active = tab === "cohort" ? cohort : leads;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Pilot tracking</h1>
          <p className="text-sm text-muted-foreground">
            How many people apply, how many you approve, who they are — and how far each cohort
            member has got.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void active.refetch()}
          disabled={active.isFetching}
        >
          <RefreshCw
            className={`mr-1 h-4 w-4 ${active.isFetching ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </Button>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => void navigate({ search: { tab: v as Tab }, replace: true })}
      >
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="cohort">Cohort progress</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-6">
          {leads.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : leads.isError ? (
            <LoadError what="pilot leads" />
          ) : (
            <PilotLeadTracking
              applications={leads.data ?? []}
              cohort={leads.data?.[0]?.cohort ?? null}
            />
          )}
        </TabsContent>

        <TabsContent value="cohort" className="mt-6">
          {cohort.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : cohort.isError ? (
            <LoadError what="cohort progress" />
          ) : (
            <PilotCohortProgressBoard members={cohort.data?.members ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
