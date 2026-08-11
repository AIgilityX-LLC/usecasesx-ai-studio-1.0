/**
 * Launch governance card — waiver override, recorded verdicts, evidence
 * timeline export and the reminder dispatch ledger.
 *
 * Every number shown comes from a recorded row. The waiver dialog states, in
 * the admin's own words, who is accepting the risk and why, because that text
 * becomes part of the release record.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Download, FileText, MailWarning, ShieldOff } from "lucide-react";

import {
  getPilotGovernanceFn,
  grantLaunchWaiverFn,
  recordPilotVerdictFn,
  revokeLaunchWaiverFn,
  runEvidenceGapEmailsFn,
} from "@/lib/pilot/pilot.functions";
import { DISPATCH_STATUS_LABEL, activeWaiver, isWaiverActive } from "@/lib/pilot/pilot.governance";
import {
  buildPilotTimeline,
  buildTimelineMarkdown,
  buildTimelinePdfRows,
  buildTimelineSummaryLines,
  countTimeline,
  pilotTimelineToCsv,
  TIMELINE_PDF_COLUMNS,
  TIMELINE_CATEGORIES,
  TIMELINE_CATEGORY_LABEL,
} from "@/lib/pilot/pilot.timeline";
import { listLaunchCheckRunsFn, runAndRecordLaunchChecksFn } from "@/lib/qa/qa.functions";
import { describeRun, RUN_TRIGGER_LABEL, runVerdict } from "@/lib/qa/launch-runs";
import type { RunTrigger } from "@/lib/qa/launch-runs";
import type {
  PilotAuditEvent,
  PilotCheckpointResponse,
  PilotCohortRow,
} from "@/lib/pilot/pilot.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function download(filename: string, mime: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success("Download started", { description: filename });
}

export function PilotLaunchGovernanceCard({
  cohort,
  rows,
  checkpoints,
  audit,
  emailByUserId,
}: {
  cohort: string;
  rows: PilotCohortRow[];
  checkpoints: PilotCheckpointResponse[];
  audit: PilotAuditEvent[];
  emailByUserId: Record<string, string>;
}) {
  const loadGovernance = useServerFn(getPilotGovernanceFn);
  const grant = useServerFn(grantLaunchWaiverFn);
  const revoke = useServerFn(revokeLaunchWaiverFn);
  const recordVerdict = useServerFn(recordPilotVerdictFn);
  const runGapEmails = useServerFn(runEvidenceGapEmailsFn);
  const runChecks = useServerFn(runAndRecordLaunchChecksFn);
  const loadCheckRuns = useServerFn(listLaunchCheckRunsFn);
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approverRole, setApproverRole] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const governance = useQuery({
    queryKey: ["pilot-governance"],
    queryFn: () => loadGovernance(),
    retry: false,
  });

  const checkRuns = useQuery({
    queryKey: ["pilot-launch-check-runs", cohort],
    queryFn: () => loadCheckRuns({ data: { cohort, limit: 25 } }),
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["pilot-governance"] });
    void queryClient.invalidateQueries({ queryKey: ["pilot-triage"] });
    void queryClient.invalidateQueries({ queryKey: ["pilot-cohort"] });
    void queryClient.invalidateQueries({ queryKey: ["pilot-launch-check-runs"] });
  };

  /**
   * Re-runs the signed-in P0/P1 launch checks and records the pass, so the
   * evidence timeline shows the checks that were green at the moment a waiver
   * was approved or revoked.
   */
  const rerunChecks = async (trigger: RunTrigger, triggerDetail: string) => {
    try {
      const { run } = await runChecks({ data: { cohort, trigger, triggerDetail } });
      const verdict = run.summary.verdict;
      const description = `${run.summary.passed}/${run.summary.total} passed · P0 failures ${run.summary.p0Failures}`;
      if (verdict === "pass") toast.success("Launch checks re-run — pass", { description });
      else if (verdict === "attention")
        toast.warning("Launch checks re-run — needs attention", { description });
      else toast.error("Launch checks re-run — P0 failure", { description });
    } catch (error) {
      toast.error("Launch checks could not be re-run", {
        description: error instanceof Error ? error.message : "Run them from Launch checks.",
      });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["pilot-launch-check-runs"] });
    }
  };

  const waivers = governance.data?.waivers ?? [];
  const snapshots = governance.data?.snapshots ?? [];
  const dispatches = governance.data?.dispatches ?? [];
  const current = activeWaiver(waivers);

  const timeline = useMemo(
    () =>
      buildPilotTimeline({
        cohort,
        rows,
        checkpoints,
        audit,
        emailByUserId,
        dispatches,
        snapshots,
        waivers,
        launchCheckRuns: checkRuns.data ?? [],
      }),
    [
      cohort,
      rows,
      checkpoints,
      audit,
      emailByUserId,
      dispatches,
      snapshots,
      waivers,
      checkRuns.data,
    ],
  );
  const counts = useMemo(() => countTimeline(timeline), [timeline]);
  const stamp = new Date().toISOString().slice(0, 10);

  const grantMutation = useMutation({
    mutationFn: () =>
      grant({
        data: {
          reason: reason.trim(),
          approverName: approverName.trim(),
          approverRole: approverRole.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Launch waiver recorded", {
        description: "The verdict now shows as a conditional go under an explicit override.",
      });
      setDialogOpen(false);
      void rerunChecks("waiver_granted", `Waiver approved by ${approverName.trim() || "an admin"}`);
      setReason("");
      setExpiresAt("");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error("Waiver not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revoke({ data: { id, reason: revokeReason.trim() || null } }),
    onSuccess: () => {
      toast.success("Launch waiver revoked");
      void rerunChecks("waiver_revoked", revokeReason.trim() || "Waiver revoked");
      setRevokeReason("");
      refresh();
    },
    onError: (error: unknown) =>
      toast.error("Waiver not revoked", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const snapshotMutation = useMutation({
    mutationFn: () => recordVerdict(),
    onSuccess: (snapshot) => {
      toast.success("Verdict recorded", { description: snapshot.headline });
      void rerunChecks("verdict_recorded", snapshot.headline);
      refresh();
    },
    onError: (error: unknown) =>
      toast.error("Verdict not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const gapEmailMutation = useMutation({
    mutationFn: () => runGapEmails({ data: { dryRun: false } }),
    onSuccess: (result) => {
      toast.success(
        result.sent > 0
          ? `${result.sent} reminder email${result.sent === 1 ? "" : "s"} sent`
          : "No reminder email was sent",
        {
          description:
            result.blockedReason ??
            `${result.planned} planned · ${result.blocked} blocked · ${result.alreadySent} already nudged this window`,
        },
      );
      refresh();
    },
    onError: (error: unknown) =>
      toast.error("Reminder pass failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  if (governance.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launch governance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (governance.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Launch governance could not be loaded</AlertTitle>
        <AlertDescription>
          {governance.error instanceof Error ? governance.error.message : "Please try again."}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => void governance.refetch()}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const blockedDispatches = dispatches.filter(
    (dispatch) => dispatch.status === "blocked_no_sender_domain",
  );

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-4 w-4" aria-hidden /> Launch governance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A waiver is an explicit, named override for missing pilot evidence only. It can never
          clear an open P0 finding, and every grant, revocation and recorded verdict enters the
          audit trail.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {current ? (
          <Alert>
            <ShieldOff className="h-4 w-4" aria-hidden />
            <AlertTitle>Evidence waiver in force</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {current.approverName} ({current.approverRole}) accepted the evidence shortfall:{" "}
                {current.reason}
              </p>
              <p className="text-xs">
                Granted {new Date(current.createdAt).toLocaleString()} ·{" "}
                {current.expiresAt
                  ? `expires ${new Date(current.expiresAt).toLocaleString()}`
                  : "no expiry — revoke it once evidence lands"}
              </p>
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="waiver-revoke-reason" className="text-xs">
                    Revocation reason (optional)
                  </Label>
                  <Input
                    id="waiver-revoke-reason"
                    value={revokeReason}
                    onChange={(event) => setRevokeReason(event.target.value)}
                    className="h-9 w-64"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(current.id)}
                >
                  {revokeMutation.isPending ? "Revoking…" : "Revoke waiver"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No waiver is in force. The release verdict is the measured one.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" disabled={Boolean(current)}>
                <ShieldOff className="mr-2 h-4 w-4" aria-hidden /> Grant evidence waiver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant a launch waiver</DialogTitle>
                <DialogDescription>
                  This records a named acceptance of the pilot evidence shortfall. Open P0 findings
                  are never waived — they must be fixed and re-tested.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="waiver-approver">Approver name</Label>
                    <Input
                      id="waiver-approver"
                      value={approverName}
                      onChange={(event) => setApproverName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="waiver-role">Approver role</Label>
                    <Input
                      id="waiver-role"
                      value={approverRole}
                      onChange={(event) => setApproverRole(event.target.value)}
                      placeholder="e.g. Product owner"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="waiver-reason">Reason and accepted risk</Label>
                  <Textarea
                    id="waiver-reason"
                    rows={4}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="At least 20 characters — what is being accepted, and why launch proceeds without full pilot evidence."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="waiver-expiry">Expiry (optional)</Label>
                  <Input
                    id="waiver-expiry"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={
                    grantMutation.isPending ||
                    reason.trim().length < 20 ||
                    approverName.trim().length < 2 ||
                    approverRole.trim().length < 2
                  }
                  onClick={() => grantMutation.mutate()}
                >
                  {grantMutation.isPending ? "Recording…" : "Record waiver"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="outline"
            disabled={snapshotMutation.isPending}
            onClick={() => snapshotMutation.mutate()}
          >
            <BadgeCheck className="mr-2 h-4 w-4" aria-hidden />
            {snapshotMutation.isPending ? "Recording…" : "Record current verdict"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={gapEmailMutation.isPending}
            onClick={() => gapEmailMutation.mutate()}
          >
            <MailWarning className="mr-2 h-4 w-4" aria-hidden />
            {gapEmailMutation.isPending ? "Running…" : "Run evidence-gap reminders"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={timeline.length === 0}
            onClick={() =>
              download(
                `pilot-timeline-${cohort}-${stamp}.csv`,
                "text/csv",
                pilotTimelineToCsv(timeline),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" aria-hidden /> Evidence timeline CSV
          </Button>
          <Button
            size="sm"
            disabled={timeline.length === 0}
            onClick={() =>
              download(
                `pilot-timeline-${cohort}-${stamp}.md`,
                "text/markdown",
                buildTimelineMarkdown({
                  cohort,
                  generatedAt: new Date().toISOString(),
                  events: timeline,
                }),
              )
            }
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden /> Evidence timeline report
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={timeline.length === 0 || pdfBusy}
            onClick={() => void exportTimelinePdf()}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden />
            {pdfBusy ? "Building…" : "Evidence timeline PDF"}
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-medium">Signed-in launch checks</h3>
          <p className="text-xs text-muted-foreground">
            Re-run automatically whenever a waiver is approved or revoked, a verdict is recorded, or
            a participant's pilot status changes. Every pass is part of the timeline above.
          </p>
          {checkRuns.isLoading ? (
            <p className="mt-2 text-xs text-muted-foreground">Loading recorded runs…</p>
          ) : checkRuns.isError ? (
            <p className="mt-2 text-xs text-destructive">
              {checkRuns.error instanceof Error
                ? checkRuns.error.message
                : "Recorded runs could not be loaded."}
            </p>
          ) : (checkRuns.data ?? []).length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No run recorded yet — approve a waiver or use the button below to record one.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {(checkRuns.data ?? []).slice(0, 5).map((run) => (
                <li
                  key={run.id}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-xs"
                >
                  <Badge
                    variant={runVerdict(run) === "pass" ? "secondary" : "destructive"}
                    className="uppercase"
                  >
                    {runVerdict(run)}
                  </Badge>
                  <span className="font-medium">{RUN_TRIGGER_LABEL[run.trigger] ?? run.trigger}</span>
                  <span className="min-w-0 flex-1 text-muted-foreground">{describeRun(run)}</span>
                  <time dateTime={run.createdAt} className="tabular-nums text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
          <Button
            className="mt-2"
            size="sm"
            variant="outline"
            onClick={() => void rerunChecks("manual", "Run from launch governance")}
          >
            <BadgeCheck className="mr-2 h-4 w-4" aria-hidden /> Re-run launch checks now
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-medium">Evidence timeline</h3>
          <p className="text-xs text-muted-foreground">
            {timeline.length === 0
              ? "No pilot events recorded yet — the trail fills itself as seats, answers and admin actions land."
              : `${timeline.length} event(s) between ${timeline[0]!.at.slice(0, 10)} and ${timeline[
                  timeline.length - 1
                ]!.at.slice(0, 10)}.`}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-4 lg:grid-cols-7" role="list">
            {TIMELINE_CATEGORIES.map((category) => (
              <div key={category} role="listitem" className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {TIMELINE_CATEGORY_LABEL[category]}
                </p>
                <p className="mt-1 text-lg font-semibold">{counts[category]}</p>
              </div>
            ))}
          </div>
        </div>

        {blockedDispatches.length > 0 && (
          <Alert>
            <MailWarning className="h-4 w-4" aria-hidden />
            <AlertTitle>
              {blockedDispatches.length} reminder email(s) waiting on a sender domain
            </AlertTitle>
            <AlertDescription>
              The nudges are logged and participants still see them in the app. Email delivery
              starts once a verified sender domain is set up for this project.
            </AlertDescription>
          </Alert>
        )}

        {dispatches.length > 0 && (
          <div>
            <h3 className="text-sm font-medium">Reminder dispatch log</h3>
            <ul className="mt-2 divide-y rounded-lg border text-sm">
              {dispatches.slice(0, 10).map((dispatch) => (
                <li key={dispatch.id} className="flex flex-wrap items-center gap-2 p-3">
                  <Badge variant={dispatch.status === "sent" ? "default" : "outline"}>
                    {DISPATCH_STATUS_LABEL[dispatch.status] ?? dispatch.status}
                  </Badge>
                  <span className="font-medium">{dispatch.recipientEmail}</span>
                  <span className="text-muted-foreground">{dispatch.kind}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(dispatch.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {snapshots.length > 0 && (
          <div>
            <h3 className="text-sm font-medium">Recorded verdicts</h3>
            <ul className="mt-2 space-y-2">
              {snapshots.slice(0, 8).map((snapshot) => (
                <li key={snapshot.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={snapshot.verdict === "go" ? "default" : "outline"}>
                      {snapshot.verdict}
                    </Badge>
                    <span className="font-medium">{snapshot.headline}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {snapshot.checkpointAnswers} answer(s) · {snapshot.registered}/
                    {snapshot.invited} seats claimed · P0 {snapshot.p0Count} / P1 {snapshot.p1Count}
                    {snapshot.waiverId ? " · recorded under a waiver" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {waivers.filter((waiver) => !isWaiverActive(waiver)).length > 0 && (
          <div>
            <h3 className="text-sm font-medium">Past waivers</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {waivers
                .filter((waiver) => !isWaiverActive(waiver))
                .slice(0, 5)
                .map((waiver) => (
                  <li key={waiver.id} className="rounded-lg border p-3">
                    <p className="font-medium">
                      {waiver.approverName} ({waiver.approverRole})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {waiver.reason} ·{" "}
                      {waiver.revokedAt
                        ? `revoked ${new Date(waiver.revokedAt).toLocaleString()}`
                        : "expired"}
                      {waiver.revokeReason ? ` — ${waiver.revokeReason}` : ""}
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
