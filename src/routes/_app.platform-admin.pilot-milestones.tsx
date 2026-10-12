/**
 * Administration → Pilot milestones.
 *
 * The approval queue behind the participant portal: every submitted milestone,
 * the evidence measured at submission time, and an approve / request-changes
 * decision that writes an audit event.
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { decidePilotMilestoneFn, listPilotMilestoneApprovalsFn } from "@/lib/pilot/pilot.functions";
import { PILOT_MILESTONES } from "@/lib/pilot/pilot.milestones";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/platform-admin/pilot-milestones")({
  head: () => privateHead("Pilot milestone approvals"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES}>
      <PilotMilestoneApprovals />
    </RequireRoles>
  ),
});

const MILESTONE_LABEL = new Map<string, string>(PILOT_MILESTONES.map((m) => [m.key, m.label]));

function PilotMilestoneApprovals() {
  const list = useServerFn(listPilotMilestoneApprovalsFn);
  const decide = useServerFn(decidePilotMilestoneFn);
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"submitted" | "all">("submitted");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["admin", "pilot-milestones", scope],
    queryFn: () => list({ data: { status: scope } as never }),
  });

  const mutation = useMutation({
    mutationFn: (input: {
      userId: string;
      key: string;
      decision: "approved" | "changes_requested";
      note: string | null;
    }) => decide({ data: input as never }),
    onSuccess: (result) => {
      if (result && "ok" in result && result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("Decision recorded.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "pilot-milestones"] });
    },
    onError: () => toast.error("Could not record the decision."),
  });

  const approvals = query.data?.approvals ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pilot milestone approvals</h1>
        <p className="text-sm text-muted-foreground">
          Cohort {query.data?.cohort ?? "—"} · confirm participant milestones so pilot evidence
          reflects real, reviewed delivery.
        </p>
      </header>

      <Tabs value={scope} onValueChange={(v) => setScope(v as "submitted" | "all")}>
        <TabsList>
          <TabsTrigger value="submitted">Awaiting decision</TabsTrigger>
          <TabsTrigger value="all">All submissions</TabsTrigger>
        </TabsList>
      </Tabs>

      {query.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <EmptyState
          title="Could not load approvals"
          description="Refresh the page, or check that your account still holds a platform admin role."
        />
      ) : approvals.length === 0 ? (
        <EmptyState
          title="Nothing awaiting approval"
          description="Milestones appear here as soon as participants submit them from their portal."
        />
      ) : (
        <ul className="space-y-3">
          {approvals.map((row) => {
            const id = `${row.userId}:${row.milestoneKey}`;
            const evidence = row.evidence ?? {};
            return (
              <li key={id}>
                <Card>
                  <CardHeader className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {MILESTONE_LABEL.get(row.milestoneKey) ?? row.milestoneKey}
                      </CardTitle>
                      <Badge variant={row.status === "approved" ? "default" : "secondary"}>
                        {row.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardDescription>
                      {row.participantName ?? row.participantEmail ?? row.userId}
                      {row.organization ? ` · ${row.organization}` : ""}
                      {row.sector ? ` · ${row.sector}` : ""}
                      {row.country ? ` · ${row.country}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {row.participantNote ? (
                      <p className="text-sm text-foreground">“{row.participantNote}”</p>
                    ) : null}
                    <dl className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {Object.entries(evidence).map(([key, value]) => (
                        <div key={key} className="rounded-md border border-border px-2 py-1">
                          <dt className="inline font-medium text-foreground">{key}</dt>
                          <dd className="ml-1 inline">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={notes[id] ?? ""}
                        onChange={(e) => setNotes((p) => ({ ...p, [id]: e.target.value }))}
                        placeholder="Decision note (optional)"
                        aria-label="Decision note"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              userId: row.userId,
                              key: row.milestoneKey,
                              decision: "approved",
                              note: notes[id]?.trim() || null,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              userId: row.userId,
                              key: row.milestoneKey,
                              decision: "changes_requested",
                              note: notes[id]?.trim() || null,
                            })
                          }
                        >
                          Request changes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
