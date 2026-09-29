/**
 * Portfolio dependencies (list-first) + accessible adjacency graph + insights + scenarios.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  addPortfolioDependencyFn,
  applyScenarioScores,
  DEFAULT_SCENARIO_WEIGHTS,
  deletePortfolioDependencyFn,
  DEPENDENCY_TYPE_LABEL,
  DEPENDENCY_TYPES,
  detectPortfolioInsights,
  emptyScenarioDraft,
  listPortfolioDependenciesFn,
  listPortfolioScenariosFn,
  savePortfolioScenarioFn,
  toDependencyEdges,
  type DependencyType,
  type PortfolioDependency,
} from "@/lib/portfolio";
import type { PortfolioEntry } from "@/lib/portfolio-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  portfolioId: string;
  entries: PortfolioEntry[];
  canManage?: boolean;
};

export function PortfolioDependenciesScenariosPanel({
  portfolioId,
  entries,
  canManage = true,
}: Props) {
  const listDeps = useServerFn(listPortfolioDependenciesFn);
  const addDep = useServerFn(addPortfolioDependencyFn);
  const delDep = useServerFn(deletePortfolioDependencyFn);
  const listScn = useServerFn(listPortfolioScenariosFn);
  const saveScn = useServerFn(savePortfolioScenarioFn);
  const qc = useQueryClient();

  const depsQuery = useQuery({
    queryKey: ["portfolio-deps", portfolioId],
    queryFn: () => listDeps({ data: { portfolioId } }),
  });
  const scnQuery = useQuery({
    queryKey: ["portfolio-scenarios", portfolioId],
    queryFn: () => listScn({ data: { portfolioId } }),
  });

  const titleById = useMemo(
    () =>
      Object.fromEntries(
        entries.map((e) => [e.useCaseId, e.useCaseTitle ?? e.useCaseId.slice(0, 8)]),
      ),
    [entries],
  );

  const deps = (depsQuery.data ?? []) as PortfolioDependency[];
  const edges = useMemo(() => toDependencyEdges(deps, titleById), [deps, titleById]);
  const insights = useMemo(
    () =>
      detectPortfolioInsights({
        entries: entries.map((e) => ({
          useCaseId: e.useCaseId,
          title: e.useCaseTitle ?? e.useCaseId,
          valuePotential: e.valuePotential,
          complexity: e.complexity,
          riskLevel: e.riskLevel,
          functionName: e.functionName,
          decision: e.decision,
        })),
        dependencies: deps,
      }),
    [entries, deps],
  );

  const [fromId, setFromId] = useState(entries[0]?.useCaseId ?? "");
  const [depType, setDepType] = useState<DependencyType>("data");
  const [toId, setToId] = useState("");
  const [label, setLabel] = useState("");
  const [draft, setDraft] = useState(emptyScenarioDraft({ name: "Balanced" }));
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const activeWeights =
    scnQuery.data?.find((s) => s.id === activeScenarioId)?.weights ?? draft.weights;

  const scenarioView = useMemo(
    () =>
      applyScenarioScores(
        entries.map((e) => ({
          useCaseId: e.useCaseId,
          title: e.useCaseTitle ?? e.useCaseId,
          valuePotential: e.valuePotential,
          complexity: e.complexity,
          riskLevel: e.riskLevel,
          timeToValue: e.timeToValue,
        })),
        activeWeights,
      ),
    [entries, activeWeights],
  );

  const addMutation = useMutation({
    mutationFn: () =>
      addDep({
        data: {
          portfolioId,
          fromUseCaseId: fromId,
          dependencyType: depType,
          toUseCaseId: depType === "prerequisite_use_case" ? toId || null : null,
          label:
            label.trim() ||
            (depType === "prerequisite_use_case"
              ? titleById[toId] ?? "Prerequisite"
              : DEPENDENCY_TYPE_LABEL[depType]),
          notes: null,
        },
      }),
    onSuccess: () => {
      toast.success("Dependency added");
      setLabel("");
      void qc.invalidateQueries({ queryKey: ["portfolio-deps", portfolioId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveScnMutation = useMutation({
    mutationFn: () => saveScn({ data: { portfolioId, draft } }),
    onSuccess: (row) => {
      toast.success("Scenario saved (baseline unchanged)");
      setActiveScenarioId(row.id);
      void qc.invalidateQueries({ queryKey: ["portfolio-scenarios", portfolioId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (depsQuery.isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dependencies & scenarios</CardTitle>
        <CardDescription>
          Typed dependencies (list first, graph as enhancement). Saved scenarios vary weights,
          budget, capacity and constraints without changing the approved baseline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deps">
          <TabsList>
            <TabsTrigger value="deps">Dependencies</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="deps" className="space-y-4 pt-3">
            {canManage && entries.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label>From use case</Label>
                  <Select value={fromId} onValueChange={setFromId}>
                    <SelectTrigger aria-label="From use case">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entries.map((e) => (
                        <SelectItem key={e.useCaseId} value={e.useCaseId}>
                          {e.useCaseTitle ?? e.useCaseId.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={depType}
                    onValueChange={(v) => setDepType(v as DependencyType)}
                  >
                    <SelectTrigger aria-label="Dependency type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPENDENCY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {DEPENDENCY_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {depType === "prerequisite_use_case" ? (
                  <div className="space-y-1">
                    <Label>Prerequisite</Label>
                    <Select value={toId} onValueChange={setToId}>
                      <SelectTrigger aria-label="Prerequisite use case">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {entries
                          .filter((e) => e.useCaseId !== fromId)
                          .map((e) => (
                            <SelectItem key={e.useCaseId} value={e.useCaseId}>
                              {e.useCaseTitle ?? e.useCaseId.slice(0, 8)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. Vendor X, CRM API"
                    />
                  </div>
                )}
                <div className="flex items-end">
                  <Button
                    type="button"
                    disabled={addMutation.isPending}
                    onClick={() => addMutation.mutate()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            {deps.length === 0 ? (
              <EmptyState
                title="No dependencies yet"
                description="Add data, model, vendor, platform, integration, policy, skills or prerequisite links."
              />
            ) : (
              <ul className="space-y-2" aria-label="Dependency list">
                {deps.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">
                        {titleById[d.fromUseCaseId] ?? d.fromUseCaseId.slice(0, 8)}
                      </span>
                      <span className="text-muted-foreground"> → </span>
                      <Badge variant="secondary" className="mr-1">
                        {DEPENDENCY_TYPE_LABEL[d.dependencyType]}
                      </Badge>
                      {d.toUseCaseId
                        ? (titleById[d.toUseCaseId] ?? d.label)
                        : d.label}
                    </span>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          delDep({ data: { id: d.id } }).then(() => {
                            void qc.invalidateQueries({
                              queryKey: ["portfolio-deps", portfolioId],
                            });
                          })
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="graph" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              Accessible adjacency list derived from the dependency list (same data).
            </p>
            {edges.length === 0 ? (
              <EmptyState title="Nothing to graph" description="Add dependencies first." />
            ) : (
              <ul className="space-y-1 font-mono text-xs" aria-label="Dependency graph">
                {edges.map((e) => (
                  <li key={e.id}>
                    [{e.typeLabel}] {e.fromLabel} → {e.toLabel}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-4 pt-3">
            <p className="text-sm text-muted-foreground">
              Baseline scores use equal weights ({JSON.stringify(DEFAULT_SCENARIO_WEIGHTS)}).
              Scenarios never write back to portfolio membership.
            </p>
            {canManage && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                  <Label>Budget</Label>
                  <Input
                    type="number"
                    value={draft.budget ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        budget: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={draft.capacity ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        capacity: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                  <Label>Constraints</Label>
                  <Textarea
                    value={draft.constraints}
                    onChange={(e) => setDraft((d) => ({ ...d, constraints: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  {(["value", "feasibility", "governability", "urgency"] as const).map((k) => (
                    <div key={k} className="space-y-1">
                      <Label>
                        Weight · {k} ({draft.weights[k]})
                      </Label>
                      <Input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        value={draft.weights[k]}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            weights: { ...d.weights, [k]: Number(e.target.value) },
                          }))
                        }
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    disabled={saveScnMutation.isPending}
                    onClick={() => saveScnMutation.mutate()}
                  >
                    Save scenario
                  </Button>
                </div>
              </div>
            )}

            {(scnQuery.data ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={activeScenarioId == null ? "default" : "outline"}
                  onClick={() => setActiveScenarioId(null)}
                >
                  Live draft
                </Button>
                {(scnQuery.data ?? []).map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={activeScenarioId === s.id ? "default" : "outline"}
                    onClick={() => setActiveScenarioId(s.id)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Scenario ranking vs baseline">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1 pr-2">Use case</th>
                    <th className="py-1 pr-2">Baseline</th>
                    <th className="py-1 pr-2">Scenario</th>
                    <th className="py-1">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioView.map((row) => (
                    <tr key={row.useCaseId} className="border-b border-border/50">
                      <td className="py-1 pr-2">{row.title}</td>
                      <td className="py-1 pr-2">{row.baselineScore}</td>
                      <td className="py-1 pr-2">{row.scenarioScore}</td>
                      <td className="py-1">{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-3 pt-3">
            {insights.length === 0 ? (
              <EmptyState
                title="No insights yet"
                description="Add more entries or dependencies to surface duplicates, shared enablers, bottlenecks, concentration and no-regret candidates."
              />
            ) : (
              <ul className="space-y-2">
                {insights.map((ins, i) => (
                  <li key={`${ins.kind}-${i}`} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{ins.kind.replaceAll("_", " ")}</Badge>
                      <span className="font-medium">{ins.title}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{ins.explanation}</p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
