/**
 * Participant milestone board.
 *
 * Shows measured delivery progress (use cases, scores, portfolio, roadmap)
 * and lets the participant submit each milestone for admin approval once the
 * underlying work exists. Approval state is owned by admins, never by the
 * participant — this surface only requests it.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, BadgeCheck, CircleDashed, Clock, RotateCcw } from "lucide-react";

import {
  MILESTONE_STATUS_LABEL,
  PILOT_MILESTONES,
  approvedPercent,
  type PilotMilestoneStatus,
  type PilotMilestoneView,
} from "@/lib/pilot/pilot.milestones";
import { getMyPilotMilestonesFn, submitPilotMilestoneFn } from "@/lib/pilot/pilot.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STATUS_VARIANT: Record<
  PilotMilestoneStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  locked: "outline",
  ready: "secondary",
  submitted: "secondary",
  approved: "default",
  changes_requested: "destructive",
};

function StatusIcon({ status }: { status: PilotMilestoneStatus }) {
  if (status === "approved") return <BadgeCheck className="h-4 w-4 text-primary" aria-hidden />;
  if (status === "submitted")
    return <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />;
  if (status === "changes_requested")
    return <RotateCcw className="h-4 w-4 text-destructive" aria-hidden />;
  return <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

export function PilotMilestoneBoard({ enabled = true }: { enabled?: boolean }) {
  const load = useServerFn(getMyPilotMilestonesFn);
  const submit = useServerFn(submitPilotMilestoneFn);
  const queryClient = useQueryClient();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const query = useQuery({
    queryKey: ["pilot", "milestones"],
    queryFn: () => load({ data: {} as never }),
    enabled,
  });

  const mutation = useMutation({
    mutationFn: (input: { key: string; note: string | null }) => submit({ data: input as never }),
    onSuccess: (result) => {
      if (result && "ok" in result && result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("Milestone submitted for approval.");
      setOpenKey(null);
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["pilot", "milestones"] });
    },
    onError: () => toast.error("Could not submit this milestone. Please try again."),
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Milestone approvals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = query.data;
  const milestones: PilotMilestoneView[] = data?.milestones ?? [];
  const progress = data?.progress;
  const percent = approvedPercent(milestones);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Milestone approvals</CardTitle>
        <CardDescription>
          Your programme progress is measured from your own workspace. Submit a milestone once the
          work exists and a programme admin confirms it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Approved milestones</span>
            <span className="font-medium text-foreground">{percent}%</span>
          </div>
          <Progress value={percent} aria-label="Approved milestone progress" />
        </div>

        {progress ? (
          <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Use cases" value={progress.useCases} />
            <Metric label="Scores" value={progress.scores} />
            <Metric label="Portfolios" value={progress.portfolios} />
            <Metric label="Portfolio items" value={progress.portfolioItems} />
            <Metric label="Roadmap items" value={progress.roadmapItems} />
            <Metric label="Checkpoints" value={progress.checkpoints} />
          </dl>
        ) : null}

        <ul className="space-y-3">
          {PILOT_MILESTONES.map((definition) => {
            const view = milestones.find((m) => m.key === definition.key);
            const status = view?.status ?? "locked";
            const canSubmit = status === "ready" || status === "changes_requested";
            return (
              <li key={definition.key} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={status} />
                      <span className="font-medium text-foreground">{definition.label}</span>
                      <Badge variant={STATUS_VARIANT[status]}>
                        {MILESTONE_STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{definition.description}</p>
                    {view?.decisionNote ? (
                      <p className="text-sm text-foreground">
                        Reviewer note: {view.decisionNote}
                        {view.decidedByLabel ? ` — ${view.decidedByLabel}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={definition.href as never}>
                        {definition.actionLabel}
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                    {canSubmit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOpenKey(openKey === definition.key ? null : definition.key)
                        }
                      >
                        {status === "changes_requested" ? "Resubmit" : "Submit for approval"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {openKey === definition.key ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note for the reviewer (what you completed, links, caveats)."
                      rows={3}
                      aria-label={`Note for ${definition.label}`}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ key: definition.key, note: note.trim() || null })
                        }
                      >
                        {mutation.isPending ? "Submitting…" : "Send for approval"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpenKey(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}
