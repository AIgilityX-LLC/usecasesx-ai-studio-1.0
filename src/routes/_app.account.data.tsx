import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { privateHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { openConsentPreferences } from "@/components/legal/ConsentBanner";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import {
  DELETION_EFFECTS,
  DELETION_STATUS_MEANING,
  EXPORT_DOWNLOAD_DAYS,
  EXPORT_SCOPE,
  EXPORT_STATUS_MEANING,
  daysUntil,
  formatBytes,
  isCancellable,
  readStoredConsent,
  type ConsentChoice,
  type DeletionStatus,
  type ExportStatus,
} from "@/lib/legal/privacy.model";
import {
  cancelDataDeletionFn,
  downloadDataExportFn,
  getDeletionRequestFn,
  listDataExportsFn,
  requestDataDeletionFn,
  requestDataExportFn,
} from "@/lib/legal/privacy.functions";

export const Route = createFileRoute("/_app/account/data")({
  head: () => privateHead("Data & privacy"),
  component: DataRightsSettingsPage,
});

function statusTone(
  status: ExportStatus | DeletionStatus,
): "default" | "secondary" | "destructive" {
  if (status === "ready" || status === "completed") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function DataRightsSettingsPage() {
  const queryClient = useQueryClient();
  const { data: context } = useWorkspaceContext();
  const workspaceId = context?.workspace?.id ?? null;
  const organizationId = context?.organization?.id ?? null;

  const listExports = useServerFn(listDataExportsFn);
  const requestExport = useServerFn(requestDataExportFn);
  const downloadExport = useServerFn(downloadDataExportFn);
  const getDeletion = useServerFn(getDeletionRequestFn);
  const cancelDeletion = useServerFn(cancelDataDeletionFn);
  const exportsQuery = useQuery({
    queryKey: ["data-exports"],
    queryFn: () => listExports(),
  });

  const deletionQuery = useQuery({
    queryKey: ["data-deletion"],
    queryFn: () => getDeletion(),
  });

  const createExport = useMutation({
    mutationFn: () => requestExport({ data: { scope: [], workspaceId, organizationId } }),
    onSuccess: () => {
      toast.success("Your data copy is ready to download.");
      void queryClient.invalidateQueries({ queryKey: ["data-exports"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not prepare your export."),
  });

  const download = useMutation({
    mutationFn: (requestId: string) => downloadExport({ data: { requestId } }),
    onSuccess: (result) => {
      const blob = new Blob([result.payloadJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => toast.error(error.message || "Download failed."),
  });

  const cancel = useMutation({
    mutationFn: (requestId: string) => cancelDeletion({ data: { requestId } }),
    onSuccess: () => {
      toast.success("Deletion request cancelled. Nothing was deleted.");
      void queryClient.invalidateQueries({ queryKey: ["data-deletion"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not cancel the request."),
  });

  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  useEffect(() => setConsent(readStoredConsent()), []);

  const deletion = deletionQuery.data ?? null;
  const active = deletion && (deletion.status === "scheduled" || deletion.status === "processing");

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 px-6 py-8">
      <h1 className="sr-only">Data and privacy settings</h1>

      {/* ------------------------------------------------------------ export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Get a copy of your data</CardTitle>
          <CardDescription>
            We assemble the records this product holds about you into a single JSON file. The
            download stays available for {EXPORT_DOWNLOAD_DAYS} days, and every request and download
            is written to the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {EXPORT_SCOPE.map((item) => (
              <li key={item.key}>· {item.label}</li>
            ))}
          </ul>

          <Button onClick={() => createExport.mutate()} disabled={createExport.isPending}>
            {createExport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Collecting your records…
              </>
            ) : (
              "Request my data"
            )}
          </Button>

          {createExport.isPending && (
            <Progress value={45} aria-label="Export in progress" className="max-w-sm" />
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Request history</h2>
            {exportsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading your requests…</p>
            )}
            {exportsQuery.isError && (
              <p className="text-sm text-destructive">Could not load your export requests.</p>
            )}
            {exportsQuery.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No requests yet. Your first copy takes a few seconds to build.
              </p>
            )}
            <ul className="divide-y divide-border">
              {(exportsQuery.data ?? []).map((request) => {
                const meaning = EXPORT_STATUS_MEANING[request.status];
                const rows = Object.values(request.rowCounts).reduce((a, b) => a + Number(b), 0);
                return (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusTone(request.status)}>{meaning.label}</Badge>
                        <span className="text-sm text-foreground">
                          {new Date(request.requestedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {meaning.detail} {rows > 0 && `· ${rows} records`}{" "}
                        {request.payloadBytes > 0 && `· ${formatBytes(request.payloadBytes)}`}
                        {request.status === "ready" &&
                          ` · expires in ${daysUntil(request.expiresAt)} days`}
                      </p>
                      {request.errorMessage && (
                        <p className="text-xs text-destructive">{request.errorMessage}</p>
                      )}
                      {request.status !== "ready" && request.progress > 0 && (
                        <Progress
                          value={request.progress}
                          aria-label="Export progress"
                          className="max-w-xs"
                        />
                      )}
                    </div>
                    {request.status === "ready" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => download.mutate(request.id)}
                        disabled={download.isPending}
                      >
                        <Download className="h-4 w-4" aria-hidden /> Download
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- consent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cookie & analytics choices</CardTitle>
          <CardDescription>
            Strictly necessary processing is always on. Optional analytics and marketing are your
            choice and can be changed at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {consent
              ? `Product analytics: ${consent.analytics ? "allowed" : "declined"} · Marketing: ${
                  consent.marketing ? "allowed" : "declined"
                } · Recorded ${new Date(consent.decidedAt).toLocaleString()} (policy ${
                  consent.policyVersion
                })`
              : "You have not made a choice yet, so only strictly necessary processing is active."}
          </p>
          <Button variant="outline" onClick={openConsentPreferences}>
            Manage cookie preferences
          </Button>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- deletion */}
      <Card className={active ? "border-destructive/50" : undefined}>
        <CardHeader>
          <CardTitle className="text-lg">Delete my account and data</CardTitle>
          <CardDescription>
            Deletion is scheduled with a grace period so an accidental request can be undone. We
            show exactly what goes and what has to stay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {active && deletion && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" aria-hidden />
              <AlertTitle>
                {DELETION_STATUS_MEANING[deletion.status].label} — effective{" "}
                {new Date(deletion.effectiveAt).toLocaleDateString()} (
                {daysUntil(deletion.effectiveAt)} days left)
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{DELETION_STATUS_MEANING[deletion.status].detail}</p>
                {isCancellable(deletion) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancel.mutate(deletion.id)}
                    disabled={cancel.isPending}
                  >
                    Cancel deletion request
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {deletion && deletion.status === "cancelled" && (
            <p className="text-sm text-muted-foreground">
              Your last request was cancelled on{" "}
              {new Date(deletion.cancelledAt ?? deletion.requestedAt).toLocaleDateString()}. Nothing
              was deleted.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">What will be deleted</h2>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {DELETION_EFFECTS.deleted.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">What has to be retained</h2>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {DELETION_EFFECTS.retained.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {!active && (
            <div className="space-y-3">
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value.slice(0, 1000))}
                placeholder="Optional: tell us why you are leaving (max 1000 characters)"
                rows={3}
              />
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Type DELETE to confirm"
                aria-label="Type DELETE to confirm"
                className="max-w-xs"
              />
              <Button
                variant="destructive"
                disabled={confirmation.trim().toUpperCase() !== "DELETE"}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Request deletion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DeletionConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        reason={reason}
        confirmation={confirmation}
        workspaceId={workspaceId}
        organizationId={organizationId}
        onDone={() => {
          setConfirmation("");
          setReason("");
          void queryClient.invalidateQueries({ queryKey: ["data-deletion"] });
        }}
      />
    </div>
  );
}

function DeletionConfirm({
  open,
  onOpenChange,
  reason,
  confirmation,
  workspaceId,
  organizationId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  reason: string;
  confirmation: string;
  workspaceId: string | null;
  organizationId: string | null;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const requestDeletion = useServerFn(requestDataDeletionFn);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      destructive
      busy={busy}
      title="Schedule account deletion?"
      description="Your account will be deleted after the grace period. You can cancel any time before the effective date."
      confirmLabel="Schedule deletion"
      onConfirm={async () => {
        setBusy(true);
        try {
          await requestDeletion({
            data: { reason: reason || null, confirmation, workspaceId, organizationId },
          });
          toast.success("Deletion scheduled. You can cancel until the effective date.");
          onOpenChange(false);
          onDone();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not schedule deletion.");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
