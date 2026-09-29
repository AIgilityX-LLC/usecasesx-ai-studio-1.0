/**
 * Studio panel: submit a use case into a decision gate, view SLA / open items.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  closeGateOpenItemFn,
  listGateCatalogueFn,
  listReviewsForUseCaseFn,
  previewMissingInputsFn,
  submitGateReviewFn,
  type GateKey,
} from "@/lib/gates";
import { computeSla, DEFAULT_GATES } from "@/lib/gates/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  useCaseId: string;
  /** Lightweight field snapshot for readiness / missing-input checks. */
  fields?: Record<string, string | null>;
};

export function DecisionGatesPanel({ useCaseId, fields = {} }: Props) {
  const listCatalogue = useServerFn(listGateCatalogueFn);
  const listReviews = useServerFn(listReviewsForUseCaseFn);
  const previewMissing = useServerFn(previewMissingInputsFn);
  const submitGate = useServerFn(submitGateReviewFn);
  const closeItem = useServerFn(closeGateOpenItemFn);
  const queryClient = useQueryClient();

  const [gateKey, setGateKey] = useState<GateKey>("intake");
  const [missing, setMissing] = useState<{ field: string; reason: string; source: string }[]>([]);

  const catalogueQuery = useQuery({
    queryKey: ["gates", "catalogue"],
    queryFn: () => listCatalogue(),
  });

  const reviewsQuery = useQuery({
    queryKey: ["gates", "reviews", useCaseId],
    queryFn: () => listReviews({ data: { useCaseId } }),
  });

  const gateMeta = useMemo(() => {
    const fromApi = catalogueQuery.data?.find((g) => g.key === gateKey);
    return fromApi ?? DEFAULT_GATES.find((g) => g.key === gateKey)!;
  }, [catalogueQuery.data, gateKey]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitGate({
        data: {
          useCaseId,
          gateKey,
          fields,
          // Gaps are recorded on the review for reviewers; hard-block stays available to callers.
          allowGaps: true,
        },
      }),
    onSuccess: () => {
      toast.success("Submitted for gate review");
      void queryClient.invalidateQueries({ queryKey: ["gates", "reviews", useCaseId] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not submit gate"),
  });

  const previewMutation = useMutation({
    mutationFn: () => previewMissing({ data: { gateKey, fields } }),
    onSuccess: (rows) => {
      setMissing(rows);
      if (rows.length === 0) toast.success("No missing inputs flagged for this gate");
      else toast.message(`${rows.length} missing input(s) flagged (informational only)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: (itemId: string) =>
      closeItem({ data: { itemId, actorKind: "human", closeNote: "Closed by reviewer" } }),
    onSuccess: () => {
      toast.success("Item closed");
      void queryClient.invalidateQueries({ queryKey: ["gates", "reviews", useCaseId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviews = reviewsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit to decision gate</CardTitle>
          <CardDescription>
            Human review only. AI may flag missing inputs but cannot approve, reject or close
            conditions. SoD applies when configured on the gate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gate-key">Gate</Label>
              <Select value={gateKey} onValueChange={(v) => setGateKey(v as GateKey)}>
                <SelectTrigger id="gate-key" aria-label="Decision gate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(catalogueQuery.data ?? DEFAULT_GATES).map((g) => (
                    <SelectItem key={g.key} value={g.key}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{gateMeta.description}</p>
              <p>
                Authority: {gateMeta.decisionAuthority} · SLA {gateMeta.slaHours}h
                {gateMeta.sodEnabled ? " · SoD on" : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              Check missing inputs
            </Button>
            <Button
              type="button"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              Submit for review
            </Button>
          </div>

          {missing.length > 0 && (
            <ul className="space-y-1 rounded-md border border-border p-3 text-sm">
              <li className="font-medium text-foreground">Missing inputs (not a decision)</li>
              {missing.map((m) => (
                <li key={m.field} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{m.field}</span> — {m.reason}
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {m.source}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {reviewsQuery.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No gate reviews yet"
          description="Submit this use case to Intake or a later gate when the required fields are ready."
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const sla = computeSla(r.submittedAt, r.slaHours);
            const open = (r.openItems ?? []).filter((i) => i.status === "open");
            return (
              <li key={r.id}>
                <Card>
                  <CardHeader className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {DEFAULT_GATES.find((g) => g.key === r.gateKey)?.label ?? r.gateKey}
                      </CardTitle>
                      <Badge variant="outline">{r.status.replaceAll("_", " ")}</Badge>
                      {sla.overdue && <Badge variant="destructive">SLA overdue</Badge>}
                      {!sla.overdue && r.submittedAt && (
                        <Badge variant="secondary">{sla.label}</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Authority: {r.decisionAuthority}
                      {r.recordVersionId
                        ? ` · Version ${r.recordVersionId.slice(0, 8)}…`
                        : " · No version pinned"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {open.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No unresolved conditions.</p>
                    ) : (
                      <ul className="space-y-2">
                        {open.map((item) => (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border p-2 text-sm"
                          >
                            <div>
                              <Badge variant="secondary" className="mr-2">
                                {item.kind === "condition" ? "Condition" : "Change request"}
                              </Badge>
                              {item.fieldKey && (
                                <span className="font-medium">{item.fieldKey}: </span>
                              )}
                              {item.body}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={closeMutation.isPending}
                              onClick={() => closeMutation.mutate(item.id)}
                            >
                              Close
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
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
