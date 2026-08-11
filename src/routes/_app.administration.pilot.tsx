import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, PauseCircle, PlayCircle, UserPlus } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  getPilotCohortFn,
  invitePilotParticipantFn,
  setPilotInvitationStatusFn,
  setPilotInvitationsPausedFn,
} from "@/lib/pilot/pilot.functions";
import {
  PILOT_STATUSES,
  pilotStatusLabel,
  summarizeCohort,
  willingnessLabel,
  type PilotStatus,
} from "@/lib/pilot/pilot.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const setStatus = useServerFn(setPilotInvitationStatusFn);
  const setPaused = useServerFn(setPilotInvitationsPausedFn);
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [pauseReason, setPauseReason] = useState("");

  const cohort = useQuery({
    queryKey: ["pilot-cohort"],
    queryFn: () => loadCohort(),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pilot-cohort"] });

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

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: PilotStatus }) => setStatus({ data: input }),
    onSuccess: () => {
      toast.success("Invitation updated");
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
  const summary = useMemo(
    () => summarizeCohort(rows, settings?.seatTarget ?? 25),
    [rows, settings?.seatTarget],
  );
  const checkpoints = cohort.data?.checkpoints ?? [];

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
        <CardHeader>
          <CardTitle className="text-base">Cohort</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No one is invited yet. Create the first invitation above.
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
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{row.fullName ?? row.email}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                        {row.organization && (
                          <p className="text-xs text-muted-foreground">{row.organization}</p>
                        )}
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
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
