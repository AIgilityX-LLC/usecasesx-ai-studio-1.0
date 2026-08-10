/**
 * Demo activity trail — reset and guided story export events.
 * Read-only view of `demo_reset_log`, visible to platform admins and
 * demonstration personas only.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDataTable, type Column } from "@/components/AdminDataTable";
import { listDemoActivityFn } from "@/lib/demo/demo-scenarios.functions";
import { DEMO_SCENARIOS } from "@/lib/demo/demo-scenarios";

type ActivityRow = {
  id: string;
  actor_label: string | null;
  scope: string;
  scenario_key: string | null;
  status: string;
  result: unknown;
  created_at: string;
};

function templateKeys(row: ActivityRow) {
  if (row.scenario_key) return [row.scenario_key];
  if (row.scope === "all") return DEMO_SCENARIOS.map((s) => s.key);
  if (row.scope === "templates") return DEMO_SCENARIOS.map((s) => s.key);
  return row.scope
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function DemoActivityLog() {
  const listActivity = useServerFn(listDemoActivityFn);
  const query = useQuery({
    queryKey: ["demo-activity-log"],
    queryFn: async () => (await listActivity({ data: { limit: 25 } })) as ActivityRow[],
  });

  const rows = query.data ?? [];

  const columns: Column<ActivityRow>[] = [
    {
      key: "when",
      header: "Timestamp",
      width: "20%",
      render: (row) => (
        <span className="whitespace-nowrap text-xs">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: "event",
      header: "Event",
      width: "18%",
      render: (row) =>
        row.scope === "story_export" ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <FileDown className="h-3.5 w-3.5" /> Story export
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Demo reset
          </span>
        ),
    },
    {
      key: "actor",
      header: "Actor",
      width: "20%",
      render: (row) => <span className="text-xs">{row.actor_label ?? "system / credential"}</span>,
    },
    {
      key: "scope",
      header: "Scope",
      width: "14%",
      render: (row) => (
        <Badge variant={row.status === "failed" ? "destructive" : "secondary"}>
          {row.scope === "story_export" ? row.status : row.scope}
        </Badge>
      ),
    },
    {
      key: "templates",
      header: "Template keys",
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          {templateKeys(row).map((key) => (
            <Badge key={key} variant="outline" className="text-[10px]">
              {key}
            </Badge>
          ))}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Demo activity trail</CardTitle>
          <CardDescription>
            Reset and guided story export events with timestamp, actor, scope and affected template
            keys. Visible to platform admins and demonstration accounts.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading activity…</p>
        ) : query.isError ? (
          <p role="alert" className="text-xs text-destructive">
            {(query.error as Error).message}
          </p>
        ) : (
          <AdminDataTable
            rows={rows}
            columns={columns}
            empty={
              <p className="text-xs text-muted-foreground">
                No demo reset or story export events recorded yet.
              </p>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
