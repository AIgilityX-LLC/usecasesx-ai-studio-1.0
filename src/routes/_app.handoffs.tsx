import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Info, Loader2, Send } from "lucide-react";

import { RequirePlan } from "@/components/RequirePlan";
import { PageHeader, EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui-kit";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { HandoffRequestDialog } from "@/components/handoffs/HandoffRequestDialog";
import { listHandoffRequests, updateHandoffStatus } from "@/lib/domain/handoffs.repository";
import {
  deliveryStatement,
  HANDOFF_STATUS_META,
  HANDOFF_TARGET_META,
  HANDOFF_TARGET_ORDER,
  makeSourceRef,
  nextStatuses,
  requestTypeLabel,
  sourceHasDrifted,
  statusNoteRequired,
  summarizeQueue,
  type HandoffRequest,
  type HandoffStatus,
  type HandoffTarget,
} from "@/lib/handoffs/handoff.model";

export const Route = createFileRoute("/_app/handoffs")({
  head: () => ({
    meta: [
      { title: "Suite handoffs — Request queue | UseCasesX™" },
      {
        name: "description",
        content:
          "Raise structured requests to SARPI readiness, SARN & CyberX C3G governance, AdvisorX guidance and human advisory, and track their status.",
      },
      { property: "og:title", content: "Suite handoffs — Request queue" },
      {
        property: "og:description",
        content:
          "One place to request readiness, governance, advisory and workshop support, with consent, source references and audit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HandoffsRoute,
});

function HandoffsRoute() {
  return (
    <RequirePlan min="pro" feature="Suite handoff requests">
      <HandoffsSurface />
    </RequirePlan>
  );
}

function toneClass(tone: "neutral" | "info" | "positive" | "warning") {
  switch (tone) {
    case "positive":
      return "border-primary/40 text-primary";
    case "warning":
      return "border-destructive/40 text-destructive";
    case "info":
      return "border-accent-foreground/30 text-accent-foreground";
    default:
      return "border-border text-muted-foreground";
  }
}

function HandoffsSurface() {
  const { data: context, isLoading: contextLoading } = useWorkspaceContext();
  const workspaceId = context?.workspace?.id ?? null;
  const workspaceName = context?.workspace?.name ?? "your workspace";
  const queryClient = useQueryClient();

  const [dialogTarget, setDialogTarget] = useState<HandoffTarget | null>(null);
  const [statusTarget, setStatusTarget] = useState<
    { request: HandoffRequest; next: HandoffStatus } | null
  >(null);
  const [note, setNote] = useState("");

  const requestsQuery = useQuery({
    queryKey: ["handoff-requests", workspaceId],
    queryFn: () => listHandoffRequests(workspaceId as string),
    enabled: Boolean(workspaceId),
  });

  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const summary = useMemo(() => summarizeQueue(requests), [requests]);

  /**
   * A workspace-level request references the workspace itself. Surfaces that
   * raise a request about a specific record (a use case, a portfolio) pass
   * their own refs into the dialog.
   */
  const workspaceRefs = useMemo(
    () =>
      workspaceId
        ? [
            makeSourceRef({
              type: "workspace",
              id: workspaceId,
              label: workspaceName,
              version: workspaceId,
            }),
          ]
        : [],
    [workspaceId, workspaceName],

  );

  const statusMutation = useMutation({
    mutationFn: async (input: { id: string; nextStatus: HandoffStatus; note: string }) =>
      updateHandoffStatus({ id: input.id, nextStatus: input.nextStatus, note: input.note }),
    onSuccess: () => {
      toast.success("Request updated");
      queryClient.invalidateQueries({ queryKey: ["handoff-requests"] });
      setStatusTarget(null);
      setNote("");
    },
    onError: (error: unknown) => {
      toast.error("Could not update the request", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  if (contextLoading || requestsQuery.isLoading) return <LoadingSkeleton />;
  if (requestsQuery.isError) {
    return (
      <ErrorState
        title="We could not load your handoff requests"
        description="Please try again in a moment."
        onRetry={() => void requestsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suite handoffs"
        description="Request readiness, governance, advisory or workshop support — and track what happens next."
      />

      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Requests are queued, not auto-integrated</AlertTitle>
        <AlertDescription>
          None of the suite services are connected to an automatic integration yet. Each request
          lands in a queue that a person works, and every status change is recorded here.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {HANDOFF_TARGET_ORDER.map((target) => {
          const meta = HANDOFF_TARGET_META[target];
          return (
            <Card key={target} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{meta.label}</CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <p className="text-xs text-muted-foreground">{deliveryStatement(target)}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{summary.byTarget[target]} raised</Badge>
                  <Button size="sm" onClick={() => setDialogTarget(target)}>
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({summary.open})</TabsTrigger>
          <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          <RequestList
            requests={requests.filter((r) => nextStatuses(r.status).length > 0)}
            onStatusChange={(request, next) => {
              setStatusTarget({ request, next });
              setNote("");
            }}
          />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <RequestList
            requests={requests}
            onStatusChange={(request, next) => {
              setStatusTarget({ request, next });
              setNote("");
            }}
          />
        </TabsContent>
      </Tabs>

      {dialogTarget && (
        <HandoffRequestDialog
          open
          onOpenChange={(open) => !open && setDialogTarget(null)}
          target={dialogTarget}
          sourceRefs={workspaceRefs}
          defaultTitle={`${HANDOFF_TARGET_META[dialogTarget].label} request`}
        />
      )}

      <Dialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Move to {statusTarget ? HANDOFF_STATUS_META[statusTarget.next].label : ""}
            </DialogTitle>
            <DialogDescription>
              {statusTarget ? HANDOFF_STATUS_META[statusTarget.next].description : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="status-note">
              Note{statusTarget && statusNoteRequired(statusTarget.next) ? "" : " (optional)"}
            </Label>
            <Input
              id="status-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed, and why"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={statusMutation.isPending}
              onClick={() =>
                statusTarget &&
                statusMutation.mutate({
                  id: statusTarget.request.id,
                  nextStatus: statusTarget.next,
                  note,
                })
              }
            >
              {statusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RequestList({
  requests,
  onStatusChange,
}: {
  requests: HandoffRequest[];
  onStatusChange: (request: HandoffRequest, next: HandoffStatus) => void;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No requests here yet"
        description="Raise a request from one of the services above, or from a use case in the Studio."
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const statusMeta = HANDOFF_STATUS_META[request.status];
        const drifted = sourceHasDrifted(request.sourceVersion, request.sourceRefs);
        return (
          <Card key={request.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{request.title}</CardTitle>
                  <CardDescription>
                    {HANDOFF_TARGET_META[request.target].label} ·{" "}
                    {requestTypeLabel(request.target, request.requestType)}
                  </CardDescription>
                </div>
                <Badge variant="outline" className={toneClass(statusMeta.tone)}>
                  {statusMeta.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {request.summary && <p className="text-muted-foreground">{request.summary}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Raised {new Date(request.createdAt).toLocaleString()}</span>
                <span>·</span>
                <span>
                  {request.sourceRefs.length} reference
                  {request.sourceRefs.length === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>Source version {request.sourceVersion?.fingerprint ?? "unknown"}</span>
                <span>·</span>
                <span>{request.deliveryMode === "endpoint" ? "Sent" : "Queued"}</span>
              </div>
              {drifted && (
                <p className="text-xs text-destructive">
                  The referenced records have changed since this request was raised.
                </p>
              )}
              {request.statusNote && (
                <p className="rounded-md bg-muted p-2 text-xs">{request.statusNote}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {nextStatuses(request.status).map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(request, next)}
                  >
                    {HANDOFF_STATUS_META[next].label}
                    <ArrowRight className="ml-2 h-3 w-3" aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
