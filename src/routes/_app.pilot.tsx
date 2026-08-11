import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Lock, ShieldCheck } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { getMyPilotFn } from "@/lib/pilot/pilot.functions";
import {
  PILOT_SEAT_TARGET_MAX,
  PILOT_SEAT_TARGET_MIN,
  availableCheckpoints,
  pilotStatusLabel,
  willingnessLabel,
} from "@/lib/pilot/pilot.model";
import { PilotCheckpointForm } from "@/components/pilot/PilotCheckpointForm";
import { RESERVED_MAP_OVERLAYS } from "@/lib/feature-flags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/pilot")({
  head: () => privateHead("Pilot mission"),
  component: PilotPage,
});

function PilotPage() {
  const load = useServerFn(getMyPilotFn);
  const pilot = useQuery({
    queryKey: ["my-pilot"],
    queryFn: () => load(),
    retry: false,
  });

  if (pilot.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-10">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (pilot.isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Alert variant="destructive">
          <AlertTitle>We could not load your pilot mission</AlertTitle>
          <AlertDescription>
            {pilot.error instanceof Error ? pilot.error.message : "Please try again."}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => void pilot.refetch()}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const data = pilot.data;
  const invitation = data?.invitation ?? null;
  const progress = data?.progress;
  const answered = (data?.checkpoints ?? []).map((c) => c.checkpoint);
  const openCheckpoints = progress ? availableCheckpoints(progress, answered) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Founding Access pilot
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your pilot mission</h1>
        <p className="text-sm text-muted-foreground">
          A controlled pilot of {PILOT_SEAT_TARGET_MIN}–{PILOT_SEAT_TARGET_MAX} practitioners
          ahead of the 14 August 2026 release. One mission, five steps: create three use cases,
          score them, build a portfolio and export the summary.
        </p>
        {invitation ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{pilotStatusLabel(invitation.status)}</Badge>
            <span className="text-xs text-muted-foreground">
              Cohort {invitation.cohort} · invited{" "}
              {new Date(invitation.invitedAt).toLocaleDateString()}
            </span>
          </div>
        ) : null}
      </header>

      {!invitation && (
        <Alert>
          <AlertTitle>You are not in the invited pilot cohort</AlertTitle>
          <AlertDescription>
            You can still run the mission — everything below works on your Founding Access plan.
            Your progress is only counted in the pilot report if your invitation email matches this
            account.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Your pilot content stays private</AlertTitle>
        <AlertDescription>
          Everything you create during the pilot belongs to your own workspace. Nothing you write is
          published to the global repository, and nothing is shared with other pilot participants.
          We read counts of what you completed and the answers you give at checkpoints — never your
          use case content.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Welcome checklist</CardTitle>
          {progress ? (
            <div className="space-y-2">
              <Progress
                value={progress.percent}
                aria-label={`Mission progress: ${progress.percent} percent`}
              />
              <p className="text-xs text-muted-foreground">
                {progress.completedSteps} of {progress.totalSteps} steps complete ·{" "}
                {progress.percent}%
              </p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-3">
            {(progress?.steps ?? []).map((step, index) => (
              <li
                key={step.key}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <Circle
                      className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {index + 1}. {step.label}
                      <span className="sr-only">{step.done ? " (complete)" : " (not started)"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{step.helper}</p>
                    <p className="mt-1 text-xs font-medium">
                      {Math.min(step.count, step.target)} / {step.target} recorded
                    </p>
                  </div>
                </div>
                <Button size="sm" variant={step.done ? "outline" : "default"} asChild>
                  <Link to={step.to as never}>{step.done ? "Review" : step.cta}</Link>
                </Button>
              </li>
            ))}
          </ol>
          {progress?.complete && (
            <Alert>
              <AlertTitle>Mission complete</AlertTitle>
              <AlertDescription>
                You have taken a use case set all the way from discovery to an exported summary.
                Please finish the final value checkpoint below.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the mission works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1. Discover.</strong> Browse the global repository
            or run the discovery wizard to find candidates worth pursuing in your organisation.
          </p>
          <p>
            <strong className="text-foreground">2. Design.</strong> Complete three use cases in the
            AI Use Case Studio™ — problem, approach, data and expected value.
          </p>
          <p>
            <strong className="text-foreground">3. Score.</strong> Run value and feasibility scoring
            on each so they can be compared on the same basis.
          </p>
          <p>
            <strong className="text-foreground">4. Prioritise and export.</strong> Group them into a
            portfolio, then export the summary you would circulate to a decision forum.
          </p>
          <p>
            Each step unlocks a short checkpoint. That is the whole ask — roughly 45–60 minutes.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Feedback checkpoints</h2>
        {openCheckpoints.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No checkpoint is open right now. Complete the next mission step and one will appear
              here.
            </CardContent>
          </Card>
        ) : (
          openCheckpoints.map((checkpoint) => (
            <PilotCheckpointForm key={checkpoint.key} checkpoint={checkpoint} />
          ))
        )}

        {(data?.checkpoints ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your answers so far</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.checkpoints ?? []).map((response) => (
                <div key={response.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{response.checkpoint}</Badge>
                    {response.journeyStage && (
                      <span className="text-xs text-muted-foreground">
                        stage: {response.journeyStage}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(response.createdAt).toLocaleString()}
                    </span>
                    {response.blocked && <Badge variant="destructive">blocked</Badge>}
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
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" aria-hidden /> Not part of this pilot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            These are designed into the model and sold with Enterprise engagements. They are not
            live in Founding Access, so please do not evaluate them during the pilot:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {RESERVED_MAP_OVERLAYS.map((overlay) => (
              <li key={overlay.key}>
                <span className="font-medium text-foreground">{overlay.label}</span> —{" "}
                {overlay.description}
              </li>
            ))}
            <li>
              <span className="font-medium text-foreground">Automated benefit verification</span> —
              ERP-linked realisation tracking.
            </li>
          </ul>
          <p>
            Something broken or missing outside a checkpoint? Use{" "}
            <Link to="/support" className="underline">
              Request features / report bugs
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
