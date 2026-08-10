import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Copy, FileDown, Info, Loader2 } from "lucide-react";

import { PageHeader, EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui-kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_DISCLAIMER, DEMO_SCENARIOS, type DemoScenario } from "@/lib/demo/demo-scenarios";
import { copyDemoScenarioFn, listMySampleCopiesFn } from "@/lib/demo/demo-scenarios.functions";
import { exportDemoStoryPDF, type LineageEntry } from "@/lib/demo/demo-story-export";
import { DemoResetControl } from "@/components/demo/DemoResetControl";

export const Route = createFileRoute("/_app/demo-scenarios")({
  head: () => ({
    meta: [
      { title: "Demo Scenarios — UseCasesX™" },
      {
        name: "description",
        content:
          "Explore labelled demonstration scenarios for diversified groups, financial services, manufacturing and SME advisory, and copy one into your own workspace.",
      },
      { property: "og:title", content: "Demo Scenarios — UseCasesX™" },
      {
        property: "og:description",
        content:
          "Guided, clearly labelled demonstration journeys from opportunity capture through portfolio, roadmap, value and report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoScenariosPage,
});

type SampleCopy = {
  id: string;
  scenario_key: string;
  scenario_label: string;
  template_version: string;
  entity_counts: Record<string, number> | null;
  created_at: string;
};

function ScenarioCard({
  scenario,
  onCopy,
  onExport,
  copying,
}: {
  scenario: DemoScenario;
  onCopy: (key: string) => void;
  onExport: (scenario: DemoScenario) => void;
  copying: boolean;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{scenario.archetype}</Badge>
          <Badge variant="outline">Demo template</Badge>
        </div>
        <CardTitle className="mt-2 text-lg">{scenario.label}</CardTitle>
        <CardDescription>{scenario.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Opportunities</dt>
            <dd className="font-medium">{scenario.opportunities.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Use cases</dt>
            <dd className="font-medium">{scenario.useCases.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Benefits tracked</dt>
            <dd className="font-medium">
              {scenario.useCases.reduce((sum, uc) => sum + uc.benefits.length, 0)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target period</dt>
            <dd className="font-medium">{scenario.portfolio.targetQuarter}</dd>
          </div>
        </dl>

        <Separator />

        <ol className="space-y-2 text-sm">
          {scenario.story.map((step) => (
            <li key={step.title} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-muted-foreground">{step.detail}</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to={step.to}>
                  Open
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </li>
          ))}
        </ol>

        <div className="mt-auto pt-2">
          <Button
            className="w-full"
            onClick={() => onCopy(scenario.key)}
            disabled={copying}
            aria-label={`Copy ${scenario.label} into my workspace`}
          >
            {copying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy sample into my workspace
          </Button>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => onExport(scenario)}
            aria-label={`Export the ${scenario.label} guided story as PDF`}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export guided story (PDF)
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Creates records you own, suffixed “(Sample)” and tagged with template lineage.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DemoScenariosPage() {
  const copyScenario = useServerFn(copyDemoScenarioFn);
  const listCopies = useServerFn(listMySampleCopiesFn);
  const queryClient = useQueryClient();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const copiesQuery = useQuery({
    queryKey: ["demo-sample-copies"],
    queryFn: async () => (await listCopies()) as SampleCopy[],
  });

  const copyMutation = useMutation({
    mutationFn: (scenarioKey: string) => copyScenario({ data: { scenarioKey } }),
    onSuccess: (result) => {
      toast.success(`Copied ${result.label} into your workspace`, {
        description: `${result.counts.opportunities} opportunities · ${result.counts.useCases} use cases · ${result.counts.benefits} benefits`,
      });
      void queryClient.invalidateQueries({ queryKey: ["demo-sample-copies"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not copy this scenario."),
    onSettled: () => setPendingKey(null),
  });

  const handleExport = (scenario: DemoScenario) => {
    exportDemoStoryPDF(scenario, (copiesQuery.data ?? []) as LineageEntry[]);
    toast.success(`Exported the ${scenario.label} guided story`);
  };

  const handleCopy = (key: string) => {
    setPendingKey(key);
    copyMutation.mutate(key);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo scenarios"
        description="Four labelled demonstration journeys you can walk through or copy into your own workspace."
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Demonstration content</AlertTitle>
        <AlertDescription>
          {DEMO_DISCLAIMER} Demo workspaces are excluded from activation metrics, and copies you
          make are ordinary records in your own workspace.
        </AlertDescription>
      </Alert>

      <DemoResetControl />

      <Tabs defaultValue="scenarios">
        <TabsList>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="copies">My sample copies</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {DEMO_SCENARIOS.map((scenario) => (
              <ScenarioCard
                key={scenario.key}
                scenario={scenario}
                onCopy={handleCopy}
                onExport={handleExport}
                copying={copyMutation.isPending && pendingKey === scenario.key}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="copies" className="mt-4">
          {copiesQuery.isLoading ? (
            <LoadingSkeleton />
          ) : copiesQuery.isError ? (
            <ErrorState
              title="Could not load your sample copies"
              description={(copiesQuery.error as Error).message}
              onRetry={() => void copiesQuery.refetch()}
            />
          ) : (copiesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No sample copies yet"
              description="Copy a scenario to create your own editable version of the full journey."
            />
          ) : (
            <div className="space-y-3">
              {(copiesQuery.data ?? []).map((copy) => (
                <Card key={copy.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{copy.scenario_label}</CardTitle>
                      <Badge variant="outline">Template {copy.template_version}</Badge>
                    </div>
                    <CardDescription>
                      Copied {new Date(copy.created_at).toLocaleString()} · lineage key{" "}
                      {copy.scenario_key}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {Object.entries(copy.entity_counts ?? {}).map(([label, count]) => (
                      <span key={label}>
                        {count} {label.replace(/([A-Z])/g, " $1").toLowerCase()}
                      </span>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
