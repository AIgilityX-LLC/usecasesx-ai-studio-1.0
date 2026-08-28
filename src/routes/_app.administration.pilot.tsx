import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  BellRing,
  Download,
  History,
  PauseCircle,
  PlayCircle,
  UserPlus,
} from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { Link } from "@tanstack/react-router";

import {
  getPilotCohortFn,
  invitePilotParticipantFn,
  invitePilotCohortFn,
  sendPilotRemindersFn,
  setPilotInvitationStatusFn,
  setPilotInvitationsPausedFn,
} from "@/lib/pilot/pilot.functions";
import {
  ROSTER_MAX_ROWS,
  ROSTER_TEMPLATE_NOTES,
  buildRosterIssueReportCsv,
  buildRosterTemplateCsv,
  parseParticipantRoster,
  rosterErrors,
  rosterWarnings,
  summarizeRosterParse,
  type RosterParseResult,
} from "@/lib/pilot/pilot.roster";
import { runAndRecordLaunchChecksFn } from "@/lib/qa/qa.functions";
import {
  PILOT_STATUSES,
  checkpointDeepLinks,
  pilotAuditActionLabel,
  pilotStatusLabel,
  summarizeCohort,
  latestEvidenceTimestamp,
  willingnessLabel,
  type PilotStatus,
} from "@/lib/pilot/pilot.model";
import {
  aiExperienceLabel,
  availabilityLabel,
  enrollmentFunnel,
} from "@/lib/pilot/pilot.onboarding";
import { PilotInvitationDispatchCard } from "@/components/pilot/PilotInvitationDispatchCard";
import { PilotFunnelAnalytics } from "@/components/pilot/PilotFunnelAnalytics";
import { PilotParticipantTimeline } from "@/components/pilot/PilotParticipantTimeline";
import { PilotCohortFilters } from "@/components/pilot/PilotCohortFilters";
import {
  EMPTY_COHORT_FILTERS,
  cohortFilterOptions,
  filterCohortRows,
  hasActiveCohortFilters,
  type CohortFilterState,
} from "@/lib/pilot/pilot.cohort-filters";
import { PilotExportMenu } from "@/components/pilot/PilotExportMenu";
import { PilotTriagePanel } from "@/components/pilot/PilotTriagePanel";
import { PilotLaunchGovernanceCard } from "@/components/pilot/PilotLaunchGovernanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/administration/pilot")({
  head: () => privateHead("Pilot programme"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="run the pilot programme">
      <PilotAdmin />
    </RequireRoles>
  ),
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PilotAdmin() {
  const loadCohort = useServerFn(getPilotCohortFn);
  const invite = useServerFn(invitePilotParticipantFn);
  const inviteCohort = useServerFn(invitePilotCohortFn);
  const setStatus = useServerFn(setPilotInvitationStatusFn);
  const setPaused = useServerFn(setPilotInvitationsPausedFn);
  const sendReminders = useServerFn(sendPilotRemindersFn);
  const runChecks = useServerFn(runAndRecordLaunchChecksFn);
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkOrganization, setBulkOrganization] = useState("");
  const [roster, setRoster] = useState<RosterParseResult | null>(null);
  const [rosterFileName, setRosterFileName] = useState<string | null>(null);

  const parsedBulkEmails = useMemo(
    () =>
      Array.from(
        new Set(
          bulkEmails
            .split(/[\s,;]+/)
            .map((value) => value.trim().toLowerCase())
            .filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)),
        ),
      ),
    [bulkEmails],
  );

  const cohort = useQuery({
    queryKey: ["pilot-cohort"],
    queryFn: () => loadCohort(),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pilot-cohort"] });

  /**
   * Records a fresh signed-in P0/P1 launch-check pass so the evidence timeline
   * shows the state of the checks at the moment the pilot changed.
   */
  const rerunLaunchChecks = async (detail: string) => {
    try {
      const { run } = await runChecks({
        data: {
          cohort: cohort.data?.settings?.cohort ?? "pilot",
          trigger: "pilot_status_changed",
          triggerDetail: detail,
        },
      });
      const description = `${run.summary.passed}/${run.summary.total} passed · P0 failures ${run.summary.p0Failures}`;
      if (run.summary.verdict === "pass")
        toast.success("Launch checks re-run — pass", { description });
      else if (run.summary.verdict === "attention")
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

  const inviteMutation = useMutation({
    mutationFn: () =>
      invite({
        data: {
          email: email.trim(),
          fullName: fullName.trim() || null,
          organization: organization.trim() || null,
        },
      }),
    onSuccess: (record) => {
      toast.success("Invitation created", { description: record.email });
      setEmail("");
      setFullName("");
      setOrganization("");
      void refresh();
    },
    onError: (error: unknown) =>
      toast.error("Invitation not created", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const remindersMutation = useMutation({
    mutationFn: () => sendReminders(),
    onSuccess: (result) => {
      toast.success(
        result.remindersCreated > 0
          ? `${result.remindersCreated} reminder${result.remindersCreated === 1 ? "" : "s"} sent`
          : "Everyone is already up to date",
        {
          description: `${result.participantsConsidered} participants checked · ${result.alreadyPending} already pending`,
        },
      );
      void refresh();
    },
    onError: (error: unknown) =>
      toast.error("Reminders not sent", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const bulkInviteMutation = useMutation({
    mutationFn: () =>
      inviteCohort({
        data: {
          emails: parsedBulkEmails,
          organization: bulkOrganization.trim() || null,
        },
      }),
    onSuccess: (result) => {
      toast.success(
        `${result.created.length} seat${result.created.length === 1 ? "" : "s"} enrolled`,
        {
          description:
            result.skipped.length > 0
              ? `${result.seatsUsed}/${result.seatTarget} seats used · ${result.skipped.length} skipped (${result.skipped[0]!.reason})`
              : `${result.seatsUsed}/${result.seatTarget} seats used`,
        },
      );
      setBulkEmails("");
      void refresh();
    },
    onError: (error: unknown) =>
      toast.error("Cohort not enrolled", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  /** CSV/TSV roster upload: parsed in the browser, enrolled in one action. */
  const rosterMutation = useMutation({
    mutationFn: () =>
      inviteCohort({
        data: {
          participants: roster?.participants ?? [],
          organization: bulkOrganization.trim() || null,
        },
      }),
    onSuccess: (result) => {
      toast.success(
        `${result.created.length} seat${result.created.length === 1 ? "" : "s"} provisioned from the file`,
        {
          description:
            result.skipped.length > 0
              ? `${result.seatsUsed}/${result.seatTarget} seats used · ${result.skipped.length} skipped (${result.skipped[0]!.reason})`
              : `${result.seatsUsed}/${result.seatTarget} seats used`,
        },
      );
      setRoster(null);
      setRosterFileName(null);
      void refresh();
    },
    onError: (error: unknown) =>
      toast.error("Roster not enrolled", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const onRosterFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseParticipantRoster(text, { maxRows: ROSTER_MAX_ROWS });
      setRoster(parsed);
      setRosterFileName(file.name);
      if (parsed.participants.length === 0) {
        toast.error("No usable rows in that file", {
          description:
            parsed.issues[0]?.reason ?? "Expected an email column or one email per line.",
        });
      }
    } catch (error) {
      toast.error("File could not be read", {
        description: error instanceof Error ? error.message : "Please upload a CSV or text file.",
      });
    }
  };

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: PilotStatus }) =>
      setStatus({ data: { ...input, reason: statusReason.trim() || null } }),
    onSuccess: (_result, input) => {
      toast.success("Invitation updated");
      // The recorded launch checks must reflect the state after the change.
      void rerunLaunchChecks(`Pilot status set to ${pilotStatusLabel(input.status)}`);
      void refresh();
    },
    onError: (error: unknown) =>
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const pauseMutation = useMutation({
    mutationFn: (paused: boolean) =>
      setPaused({ data: { paused, reason: paused ? pauseReason.trim() || null : null } }),
    onSuccess: (settings) => {
      toast.success(settings.invitationsPaused ? "New invitations paused" : "Invitations resumed");
      void refresh();
    },
    onError: (error: unknown) =>
      toast.error("Could not change the invitation switch", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const rows = cohort.data?.rows ?? [];
  const settings = cohort.data?.settings;
  const checkpoints = cohort.data?.checkpoints ?? [];
  const audit = cohort.data?.audit ?? [];
  const emailByUserId = cohort.data?.emailByUserId ?? {};
  const onboarding = cohort.data?.onboarding ?? [];
  const summary = useMemo(
    () =>
      summarizeCohort(rows, settings?.seatTarget ?? 25, {
        onboardingProfiles: onboarding.length,
        latestEvidenceAt: latestEvidenceTimestamp(
          checkpoints.map((c) => c.createdAt),
          onboarding.map((p) => p.completedAt),
        ),
      }),
    [rows, settings?.seatTarget, onboarding, checkpoints],
  );

  const funnel = useMemo(
    () =>
      enrollmentFunnel(
        rows,
        onboarding.map((profile) => profile.userId),
      ),
    [rows, onboarding],
  );
  const onboardingByUser = useMemo(
    () => Object.fromEntries(onboarding.map((profile) => [profile.userId, profile])),
    [onboarding],
  );
  const [cohortFilters, setCohortFilters] = useState<CohortFilterState>(EMPTY_COHORT_FILTERS);
  const sectorOptions = useMemo(() => cohortFilterOptions(onboarding, "sector"), [onboarding]);
  const countryOptions = useMemo(() => cohortFilterOptions(onboarding, "country"), [onboarding]);
  const visibleRows = useMemo(
    () => filterCohortRows(rows, onboardingByUser, cohortFilters),
    [rows, onboardingByUser, cohortFilters],
  );

  if (cohort.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (cohort.isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Alert variant="destructive">
          <AlertTitle>Pilot data could not be loaded</AlertTitle>
          <AlertDescription>
            {cohort.error instanceof Error ? cohort.error.message : "Please try again."}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => void cohort.refetch()}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Administration
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Pilot programme</h1>
        <p className="text-sm text-muted-foreground">
          Cohort {settings?.cohort} · seat target {summary.seatTarget}. Counts are measured from
          recorded product activity — pilot use case content is never shown here and never
          published.
        </p>
      </header>

      {settings?.invitationsPaused && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>New pilot invitations are paused</AlertTitle>
          <AlertDescription>
            {settings.pauseReason ?? "No reason recorded."}
            {settings.pausedAt ? ` · paused ${new Date(settings.pausedAt).toLocaleString()}` : ""}
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Invited" value={String(summary.invited)} hint={`of ${summary.seatTarget}`} />
        <Stat label="Registered" value={String(summary.registered)} />
        <Stat label="Activated" value={String(summary.activated)} hint="first mission step" />
        <Stat label="Completed" value={String(summary.completed)} hint="full mission" />
        <Stat
          label="Blockers"
          value={String(summary.blockersReported)}
          hint="reported at checkpoints"
        />
        <Stat label="Advisory interest" value={String(summary.advisoryInterest)} />
      </section>

      <PilotTriagePanel />

      <PilotLaunchGovernanceCard
        cohort={settings?.cohort ?? "pilot"}
        rows={rows}
        checkpoints={checkpoints}
        audit={audit}
        emailByUserId={emailByUserId}
      />

      <PilotInvitationDispatchCard
        cohort={settings?.cohort ?? "pilot"}
        seatsEnrolled={rows.filter((row) => row.status !== "revoked").length}
        onDispatched={() => void refresh()}
      />

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-base">Enrolment funnel and onboarding</CardTitle>
          <p className="text-sm text-muted-foreground">
            {funnel.invited} invited · {funnel.claimed} claimed a seat · {funnel.onboarded}{" "}
            completed onboarding
            {funnel.revoked > 0 ? ` · ${funnel.revoked} revoked` : ""}. Completing onboarding is
            what activates a seat.
          </p>
        </CardHeader>
        <CardContent>
          {onboarding.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No participant has completed onboarding yet. Send invitations, then the intake appears
              on each participant&apos;s pilot page.
            </p>
          ) : (
            <ul className="space-y-3">
              {onboarding.map((profile) => (
                <li key={profile.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{profile.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {profile.roleTitle} · {profile.organization}
                    </span>
                    <Badge variant="outline">{profile.sector}</Badge>
                    {profile.contactConsent && <Badge variant="secondary">Contactable</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {aiExperienceLabel(profile.aiExperience)} · time{" "}
                    {availabilityLabel(profile.availability)}
                    {profile.country ? ` · ${profile.country}` : ""} ·{" "}
                    {new Date(profile.completedAt).toLocaleString()}
                  </p>
                  <p className="mt-2">{profile.primaryGoal}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PilotFunnelAnalytics rows={rows} onboarding={onboarding} />

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Evidence and nudges</CardTitle>
          <p className="text-sm text-muted-foreground">
            Exports carry funnel metrics, checkpoint answers with their mission references, advisory
            interest and the full audit trail. Reminders only nudge steps and checkpoints a
            participant has genuinely not completed.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <PilotExportMenu
            cohort={settings?.cohort ?? "pilot"}
            summary={summary}
            rows={rows}
            checkpoints={checkpoints}
            audit={audit}
            emailByUserId={emailByUserId}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={remindersMutation.isPending || rows.length === 0}
            onClick={() => remindersMutation.mutate()}
          >
            <BellRing className="mr-2 h-4 w-4" aria-hidden />
            {remindersMutation.isPending ? "Sending…" : "Send pending-step reminders"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" aria-hidden /> Invite a participant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pilot-email">Work email</Label>
              <Input
                id="pilot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@organisation.com"
                disabled={settings?.invitationsPaused}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="pilot-name">Name (optional)</Label>
                <Input
                  id="pilot-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={settings?.invitationsPaused}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pilot-org">Organisation (optional)</Label>
                <Input
                  id="pilot-org"
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  disabled={settings?.invitationsPaused}
                />
              </div>
            </div>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={
                inviteMutation.isPending || !email.trim() || Boolean(settings?.invitationsPaused)
              }
            >
              {inviteMutation.isPending ? "Creating…" : "Create invitation"}
            </Button>
            <p className="text-xs text-muted-foreground">
              The invitation is claimed automatically when that email registers and opens the pilot
              mission page. No account is created here.
            </p>
            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <div className="space-y-1">
                <Label htmlFor="pilot-bulk-emails">Enrol the cohort (bulk)</Label>
                <Textarea
                  id="pilot-bulk-emails"
                  rows={4}
                  placeholder="Paste 15–25 work emails, separated by commas, spaces or new lines"
                  value={bulkEmails}
                  onChange={(event) => setBulkEmails(event.target.value)}
                  disabled={settings?.invitationsPaused}
                  aria-describedby="pilot-bulk-help"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pilot-bulk-org">Organisation (optional, applied to all)</Label>
                <Input
                  id="pilot-bulk-org"
                  value={bulkOrganization}
                  onChange={(event) => setBulkOrganization(event.target.value)}
                  disabled={settings?.invitationsPaused}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => bulkInviteMutation.mutate()}
                  disabled={
                    bulkInviteMutation.isPending ||
                    parsedBulkEmails.length === 0 ||
                    Boolean(settings?.invitationsPaused)
                  }
                >
                  {bulkInviteMutation.isPending
                    ? "Enrolling…"
                    : `Enrol ${parsedBulkEmails.length || ""} seat${parsedBulkEmails.length === 1 ? "" : "s"}`.trim()}
                </Button>
                <p id="pilot-bulk-help" className="text-xs text-muted-foreground">
                  {parsedBulkEmails.length === 0
                    ? "No valid email addresses detected yet — max 25 per batch."
                    : `${parsedBulkEmails.length} valid address${parsedBulkEmails.length === 1 ? "" : "es"} detected. Duplicates and full-cohort overflow are skipped and reported.`}
                </p>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="pilot-roster-file">Or upload a roster file (CSV/TSV)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const csv = buildRosterTemplateCsv();
                      const blob = new Blob([`\uFEFF${csv}`], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = "pilot-roster-template.csv";
                      document.body.appendChild(anchor);
                      anchor.click();
                      anchor.remove();
                      URL.revokeObjectURL(url);
                      toast.success("Roster template downloaded", {
                        description: "Replace the sample rows with your participants.",
                      });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden /> Download CSV template
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Includes the expected header row and three sample rows.
                  </span>
                </div>
                <Input
                  id="pilot-roster-file"
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/plain"
                  disabled={settings?.invitationsPaused}
                  aria-describedby="pilot-roster-help"
                  onChange={(event) => {
                    void onRosterFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <p id="pilot-roster-help" className="text-xs text-muted-foreground">
                  Columns <code>email</code>, <code>name</code>, <code>organisation</code>,{" "}
                  <code>notes</code> — header optional, or one email per line. Up to{" "}
                  {ROSTER_MAX_ROWS} seats per upload.
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {ROSTER_TEMPLATE_NOTES.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                {roster && (
                  <div className="space-y-2 rounded-md border p-3 text-xs">
                    <p className="font-medium">
                      {rosterFileName}: {summarizeRosterParse(roster)}
                    </p>
                    {roster.participants.length > 0 && (
                      <ul className="max-h-32 space-y-1 overflow-y-auto text-muted-foreground">
                        {roster.participants.map((participant) => (
                          <li key={participant.email}>
                            {participant.email}
                            {participant.fullName ? ` · ${participant.fullName}` : ""}
                            {participant.organization ? ` · ${participant.organization}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    {roster.issues.length > 0 && (
                      <details open>
                        <summary className="cursor-pointer font-medium">
                          <span className="text-destructive">
                            {rosterErrors(roster).length} row(s) blocked
                          </span>
                          {rosterWarnings(roster).length > 0
                            ? ` · ${rosterWarnings(roster).length} warning(s)`
                            : ""}
                        </summary>
                        <ul className="mt-1 space-y-1">
                          {roster.issues.slice(0, 15).map((issue, index) => (
                            <li
                              key={`${issue.value}-${index}`}
                              className="rounded border border-border px-2 py-1"
                            >
                              <span
                                className={
                                  issue.severity === "error"
                                    ? "font-medium text-destructive"
                                    : "font-medium text-muted-foreground"
                                }
                              >
                                {issue.severity === "error" ? "Error" : "Warning"}
                              </span>{" "}
                              {issue.line > 0 ? `line ${issue.line}` : "over cap"} ·{" "}
                              <code>{issue.field}</code> · {issue.value || "(empty)"} —{" "}
                              {issue.reason}{" "}
                              <span className="text-muted-foreground">Fix: {issue.fix}</span>
                            </li>
                          ))}
                        </ul>
                        {roster.issues.length > 15 && (
                          <p className="mt-1 text-muted-foreground">
                            Showing 15 of {roster.issues.length} — download the report for the full
                            list.
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            const csv = buildRosterIssueReportCsv(roster, {
                              ...(rosterFileName ? { fileName: rosterFileName } : {}),
                            });
                            const blob = new Blob([`\uFEFF${csv}`], {
                              type: "text/csv;charset=utf-8;",
                            });
                            const url = URL.createObjectURL(blob);
                            const anchor = document.createElement("a");
                            anchor.href = url;
                            anchor.download = `pilot-roster-validation-${new Date().toISOString().slice(0, 10)}.csv`;
                            document.body.appendChild(anchor);
                            anchor.click();
                            anchor.remove();
                            URL.revokeObjectURL(url);
                            toast.success("Validation report downloaded");
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" aria-hidden /> Download error report
                        </Button>
                      </details>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => rosterMutation.mutate()}
                        disabled={
                          rosterMutation.isPending ||
                          roster.participants.length === 0 ||
                          Boolean(settings?.invitationsPaused)
                        }
                      >
                        {rosterMutation.isPending
                          ? "Provisioning…"
                          : `Provision ${roster.participants.length} seat${roster.participants.length === 1 ? "" : "s"}`}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRoster(null);
                          setRosterFileName(null);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {settings?.invitationsPaused ? (
                <PlayCircle className="h-4 w-4" aria-hidden />
              ) : (
                <PauseCircle className="h-4 w-4" aria-hidden />
              )}{" "}
              P0 incident control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pausing stops any new pilot invitation from being issued. Participants already in the
              cohort keep full access — nothing is revoked and no data is touched.
            </p>
            {!settings?.invitationsPaused && (
              <div className="space-y-1">
                <Label htmlFor="pause-reason">Reason (recorded in the audit trail)</Label>
                <Input
                  id="pause-reason"
                  value={pauseReason}
                  onChange={(event) => setPauseReason(event.target.value)}
                  placeholder="e.g. P0: export pipeline failing"
                />
              </div>
            )}
            <Button
              variant={settings?.invitationsPaused ? "default" : "destructive"}
              disabled={pauseMutation.isPending}
              onClick={() => pauseMutation.mutate(!settings?.invitationsPaused)}
            >
              {pauseMutation.isPending
                ? "Saving…"
                : settings?.invitationsPaused
                  ? "Resume invitations"
                  : "Pause new invitations"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Cohort</CardTitle>
          <div className="space-y-1">
            <Label htmlFor="status-reason">Reason for the next status change (optional)</Label>
            <Input
              id="status-reason"
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              placeholder="e.g. withdrew after kickoff call"
            />
            <p className="text-xs text-muted-foreground">
              Recorded with the actor and timestamp in the audit trail below.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length > 0 && (
            <PilotCohortFilters
              filters={cohortFilters}
              onChange={setCohortFilters}
              sectors={sectorOptions}
              countries={countryOptions}
              shown={visibleRows.length}
              total={rows.length}
            />
          )}
          {rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No one is invited yet. Create the first invitation above.
            </p>
          ) : visibleRows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No seats match these filters
              {hasActiveCohortFilters(cohortFilters)
                ? " — clear them to see the full cohort."
                : "."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Pilot cohort with status, measured mission progress and feedback counts
                </caption>
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th scope="col" className="py-2 pr-4">
                      Participant
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Status
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Mission
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Checkpoints
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Blockers
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Advisory
                    </th>
                    <th scope="col" className="py-2">
                      Set status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{row.fullName ?? row.email}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                        {row.organization && (
                          <p className="text-xs text-muted-foreground">{row.organization}</p>
                        )}
                        <div className="mt-2">
                          <PilotParticipantTimeline
                            row={row}
                            audit={audit}
                            onboarding={row.userId ? (onboardingByUser[row.userId] ?? null) : null}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={row.status === "revoked" ? "destructive" : "secondary"}>
                          {pilotStatusLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 min-w-[140px]">
                        <Progress
                          value={row.progress.percent}
                          aria-label={`Mission progress ${row.progress.percent} percent`}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.progress.completedSteps}/{row.progress.totalSteps} steps
                        </p>
                      </td>
                      <td className="py-3 pr-4">{row.checkpointCount}</td>
                      <td className="py-3 pr-4">{row.blockersReported}</td>
                      <td className="py-3 pr-4">{row.advisoryInterest ? "Yes" : "—"}</td>
                      <td className="py-3">
                        <Select
                          value={row.status}
                          onValueChange={(value) =>
                            statusMutation.mutate({ id: row.id, status: value as PilotStatus })
                          }
                        >
                          <SelectTrigger
                            className="w-[150px]"
                            aria-label={`Status for ${row.email}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PILOT_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {pilotStatusLabel(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Checkpoint feedback ({summary.checkpointResponses})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checkpoints.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No checkpoint answers yet. They appear here as participants reach each journey stage.
            </p>
          ) : (
            checkpoints.map((response) => (
              <div key={response.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{response.checkpoint}</Badge>
                  {response.journeyStage && (
                    <span className="text-xs text-muted-foreground">
                      stage: {response.journeyStage}
                    </span>
                  )}
                  {response.contextRoute && (
                    <span className="text-xs text-muted-foreground">{response.contextRoute}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(response.createdAt).toLocaleString()}
                  </span>
                  {response.blocked && <Badge variant="destructive">blocked</Badge>}
                  {response.advisoryInterest && <Badge>advisory interest</Badge>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Clarity {response.rating ?? "—"} · effort {response.effortRating ?? "—"}
                  {response.valueRating != null ? ` · value ${response.valueRating}` : ""}
                  {response.willingness
                    ? ` · funding: ${willingnessLabel(response.willingness)}`
                    : ""}
                </p>
                {response.comment && <p className="mt-2">{response.comment}</p>}
                {(() => {
                  const links = checkpointDeepLinks(response);
                  if (links.length === 0) return null;
                  return (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Open the work behind it:
                      </span>
                      {links.map((link) => (
                        <Button
                          key={`${link.kind}-${link.label}`}
                          asChild
                          size="sm"
                          variant="outline"
                        >
                          {link.params ? (
                            <Link to={link.to} params={link.params}>
                              {link.label}
                            </Link>
                          ) : (
                            <Link to={link.to}>{link.label}</Link>
                          )}
                        </Button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" aria-hidden /> Audit trail ({audit.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every invitation and status transition, with who did it, when, and the reason when one
            was given.
          </p>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nothing recorded yet. Invitations and status changes appear here as they happen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Pilot invitation audit trail with actor, timestamp, transition and reason
                </caption>
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th scope="col" className="py-2 pr-4">
                      When
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Action
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Participant
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Transition
                    </th>
                    <th scope="col" className="py-2 pr-4">
                      Reason
                    </th>
                    <th scope="col" className="py-2">
                      Actor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((event) => (
                    <tr key={event.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">{pilotAuditActionLabel(event.action)}</td>
                      <td className="py-2 pr-4">{event.subjectEmail ?? "—"}</td>
                      <td className="py-2 pr-4 text-xs">
                        {event.fromStatus || event.toStatus
                          ? `${event.fromStatus ? pilotStatusLabel(event.fromStatus) : "—"} → ${
                              event.toStatus ? pilotStatusLabel(event.toStatus) : "—"
                            }`
                          : "—"}
                      </td>
                      <td className="py-2 pr-4 text-xs">{event.reason ?? "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground">{event.actorKind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
