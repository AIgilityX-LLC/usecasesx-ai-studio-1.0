import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, Loader2, Send } from "lucide-react";

import { RequirePlan } from "@/components/RequirePlan";
import { PageHeader, ErrorState, LoadingSkeleton } from "@/components/ui-kit";
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
import { HandoffAnalyticsPanel } from "@/components/handoffs/HandoffAnalyticsPanel";
import { HandoffExportDialog } from "@/components/handoffs/HandoffExportDialog";
import { HandoffQueue } from "@/components/handoffs/HandoffQueue";
import {
  bulkUpdateHandoffStatus,
  listHandoffRequests,
  listHandoffStatusEvents,
  updateHandoffStatus,
} from "@/lib/domain/handoffs.repository";
import {
  deliveryStatement,
  HANDOFF_STATUS_META,
  HANDOFF_TARGET_META,
  HANDOFF_TARGET_ORDER,
  makeSourceRef,
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

function HandoffsSurface() {
  const { data: context, isLoading: contextLoading } = useWorkspaceContext();
  const workspaceId = context?.workspace?.id ?? null;
  const workspaceName = context?.workspace?.name ?? "your workspace";
  const queryClient = useQueryClient();

  const [dialogTarget, setDialogTarget] = useState<HandoffTarget | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    request: HandoffRequest;
    next: HandoffStatus;
  } | null>(null);
  const [note, setNote] = useState("");
  const [exportTarget, setExportTarget] = useState<HandoffRequest | null>(null);

  const requestsQuery = useQuery({
    queryKey: ["handoff-requests", workspaceId],
    queryFn: () => listHandoffRequests(workspaceId as string),
    enabled: Boolean(workspaceId),
  });

  /** Status moves come from the audit log, so analytics never invent a transition. */
  const eventsQuery = useQuery({
    queryKey: ["handoff-status-events", workspaceId],
    queryFn: () => listHandoffStatusEvents(workspaceId as string, { sinceDays: 30 }),
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
      queryClient.invalidateQueries({ queryKey: ["handoff-status-events"] });
      setStatusTarget(null);
      setNote("");
    },
    onError: (error: unknown) => {
      toast.error("Could not update the request", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  /**
   * A bulk move validates each row against the same transition table as a
   * single move. Rows that cannot legally move are reported back rather than
   * forced, so a mixed selection never quietly corrupts part of the queue.
   */
  const bulkMutation = useMutation({
    mutationFn: async (input: { requests: HandoffRequest[]; nextStatus: HandoffStatus }) =>
      bulkUpdateHandoffStatus({ requests: input.requests, nextStatus: input.nextStatus }),
    onSuccess: (outcome) => {
      queryClient.invalidateQueries({ queryKey: ["handoff-requests"] });
      queryClient.invalidateQueries({ queryKey: ["handoff-status-events"] });
      if (outcome.updated.length > 0) {
        toast.success(
          `${outcome.updated.length} request${outcome.updated.length === 1 ? "" : "s"} updated`,
        );
      }
      if (outcome.skipped.length > 0) {
        toast.warning(`${outcome.skipped.length} skipped`, {
          description: outcome.skipped.map((s) => `${s.title}: ${s.reason}`).join(" · "),
        });
      }
    },
    onError: (error: unknown) => {
      toast.error("Could not update those requests", {
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

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue ({summary.total})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <HandoffQueue
            requests={requests}
            currentUserId={context?.userId ?? null}
            busy={statusMutation.isPending || bulkMutation.isPending}
            onStatusChange={(request, next) => {
              setStatusTarget({ request, next });
              setNote("");
            }}
            onBulkStatus={(selection, next) =>
              bulkMutation.mutate({ requests: selection, nextStatus: next })
            }
            onExport={(request) => setExportTarget(request)}
          />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <HandoffAnalyticsPanel requests={requests} events={eventsQuery.data ?? []} />
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

      {exportTarget && (
        <HandoffExportDialog
          request={exportTarget}
          workspaceRole={context?.workspaceRole ?? null}
          open
          onOpenChange={(open) => !open && setExportTarget(null)}
        />
      )}
    </div>
  );
}
