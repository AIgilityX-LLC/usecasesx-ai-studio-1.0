/**
 * Workspace review inbox — SLA, decide actions, field change requests, conditions.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { decideGateReviewFn, listReviewInboxFn } from "@/lib/gates";
import { DEFAULT_GATES, type GateAction } from "@/lib/gates/model";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { workspaceId: string };

const DECIDE_ACTIONS: { action: Exclude<GateAction, "submit">; label: string }[] = [
  { action: "approve", label: "Approve" },
  { action: "approve_with_conditions", label: "Approve with conditions" },
  { action: "request_changes", label: "Request changes" },
  { action: "hold", label: "Hold" },
  { action: "reject", label: "Reject" },
];

export function ReviewInbox({ workspaceId }: Props) {
  const listInbox = useServerFn(listReviewInboxFn);
  const decide = useServerFn(decideGateReviewFn);
  const queryClient = useQueryClient();

  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [conditionText, setConditionText] = useState<Record<string, string>>({});
  const [changeField, setChangeField] = useState<Record<string, string>>({});
  const [changeMsg, setChangeMsg] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["gates", "inbox", workspaceId],
    queryFn: () => listInbox({ data: { workspaceId } }),
  });

  const mutation = useMutation({
    mutationFn: (input: { reviewId: string; action: Exclude<GateAction, "submit"> }) => {
      const r = rationale[input.reviewId]?.trim() ?? "";
      if (!r) throw new Error("Rationale is required.");
      const conditions =
        input.action === "approve_with_conditions"
          ? (conditionText[input.reviewId] ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
      const changeRequests =
        input.action === "request_changes" && changeField[input.reviewId]?.trim()
          ? [
              {
                fieldKey: changeField[input.reviewId]!.trim(),
                message: (changeMsg[input.reviewId] ?? "").trim() || "Please revise this field.",
              },
            ]
          : undefined;
      return decide({
        data: {
          reviewId: input.reviewId,
          action: input.action,
          rationale: r,
          conditions,
          changeRequests,
          actorKind: "human",
        },
      });
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      void queryClient.invalidateQueries({ queryKey: ["gates", "inbox", workspaceId] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not record decision"),
  });

  const rows = query.data ?? [];

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.isError) {
    return (
      <EmptyState
        title="Could not load review inbox"
        description="Confirm you belong to this workspace and try again."
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Inbox clear"
        description="Submitted gate reviews appear here with SLA indicators until decided or conditions are resolved."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const gateLabel = DEFAULT_GATES.find((g) => g.key === row.gateKey)?.label ?? row.gateKey;
        return (
          <li key={row.id}>
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {row.useCaseTitle ?? "Use case"} · {gateLabel}
                  </CardTitle>
                  <Badge variant="outline">{row.status.replaceAll("_", " ")}</Badge>
                  {row.sla.overdue ? (
                    <Badge variant="destructive">{row.sla.label}</Badge>
                  ) : (
                    <Badge variant="secondary">{row.sla.label}</Badge>
                  )}
                  {row.openConditionCount > 0 && (
                    <Badge variant="secondary">{row.openConditionCount} open conditions</Badge>
                  )}
                  {row.openChangeRequestCount > 0 && (
                    <Badge variant="secondary">{row.openChangeRequestCount} change requests</Badge>
                  )}
                </div>
                <CardDescription>
                  Authority: {row.decisionAuthority}
                  {row.sodEnabled ? " · SoD enforced" : ""}
                  {row.recordVersionId
                    ? ` · Record version ${row.recordVersionId.slice(0, 8)}…`
                    : ""}
                  {" · "}
                  <Link
                    to="/studio/use-case/$id/gates"
                    params={{ id: row.useCaseId }}
                    className="text-primary hover:underline"
                  >
                    Open gate panel
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`rationale-${row.id}`}>Rationale</Label>
                  <Textarea
                    id={`rationale-${row.id}`}
                    value={rationale[row.id] ?? ""}
                    onChange={(e) =>
                      setRationale((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Decision rationale (required)"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`cond-${row.id}`}>Conditions (one per line)</Label>
                    <Textarea
                      id={`cond-${row.id}`}
                      value={conditionText[row.id] ?? ""}
                      onChange={(e) =>
                        setConditionText((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Required for approve with conditions"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`field-${row.id}`}>Field change request</Label>
                    <Input
                      id={`field-${row.id}`}
                      value={changeField[row.id] ?? ""}
                      onChange={(e) =>
                        setChangeField((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="field key"
                    />
                    <Input
                      value={changeMsg[row.id] ?? ""}
                      onChange={(e) =>
                        setChangeMsg((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="What must change"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DECIDE_ACTIONS.map(({ action, label }) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant={action === "reject" ? "destructive" : "outline"}
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ reviewId: row.id, action })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI cannot approve, reject or close conditions — only a human reviewer can.
                </p>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
