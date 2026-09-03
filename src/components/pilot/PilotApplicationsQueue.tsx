/**
 * Admin review queue for self-serve pilot applications.
 *
 * Approving creates a real seat through the normal invitation path; declining
 * and merging close the request without inflating cohort counts.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Inbox } from "lucide-react";

import { decidePilotApplicationFn, listPilotApplicationsFn } from "@/lib/pilot/pilot.functions";
import {
  applicationStatusLabel,
  summarizeApplications,
  type PilotApplication,
} from "@/lib/pilot/pilot.applications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function PilotApplicationsQueue() {
  const listApplications = useServerFn(listPilotApplicationsFn);
  const decide = useServerFn(decidePilotApplicationFn);
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["pilot", "applications"],
    queryFn: () => listApplications(),
  });

  const mutation = useMutation({
    mutationFn: (input: {
      id: string;
      decision: "approved" | "declined" | "merged";
      reason: string | null;
    }) => decide({ data: input }),
    onSuccess: (result) => {
      toast.success(
        result.invitationId
          ? "Approved — a pilot seat has been created for this applicant."
          : "Application closed.",
      );
      void queryClient.invalidateQueries({ queryKey: ["pilot"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not record the decision."),
  });

  const rows: PilotApplication[] = query.data ?? [];
  const summary = summarizeApplications(rows);
  const pending = rows.filter((row) => row.status === "requested");
  const decided = rows.filter((row) => row.status !== "requested").slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" aria-hidden="true" />
          Applications
        </CardTitle>
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary">{summary.requested} awaiting review</Badge>
          <Badge variant="outline">{summary.approved} approved</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Could not load applications."}
          </p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No applications are waiting. Anyone can apply at <code>/pilot/apply</code>; approved
            applications become pilot seats here.
          </p>
        ) : (
          <ul className="space-y-4">
            {pending.map((row) => (
              <li key={row.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{row.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.email} · {row.organization}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[row.roleTitle, row.sector, row.country].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
                </div>
                {row.goals ? (
                  <p className="mt-3 text-sm text-foreground/90">{row.goals}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder="Decision note (optional)"
                    value={reasons[row.id] ?? ""}
                    onChange={(e) =>
                      setReasons((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    aria-label={`Decision note for ${row.email}`}
                  />
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        id: row.id,
                        decision: "approved",
                        reason: reasons[row.id]?.trim() || null,
                      })
                    }
                  >
                    Approve &amp; invite
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        id: row.id,
                        decision: "merged",
                        reason: reasons[row.id]?.trim() || null,
                      })
                    }
                  >
                    Merge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        id: row.id,
                        decision: "declined",
                        reason: reasons[row.id]?.trim() || null,
                      })
                    }
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {decided.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent decisions
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {decided.map((row) => (
                <li key={row.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {row.email} — {applicationStatusLabel(row.status)}
                  </span>
                  <span className="text-xs">{formatDate(row.decidedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
