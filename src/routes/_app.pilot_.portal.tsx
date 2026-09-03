/**
 * Pilot participant portal.
 *
 * Mirrors everything the pilot holds about the signed-in participant — seat,
 * intake, use cases, checkpoint answers — and lets them actually move: each
 * mission step carries its own call to action and any checkpoint that is due
 * can be answered here without leaving the page.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  Compass,
  MessageSquareQuote,
  Target,
} from "lucide-react";

import { privateHead } from "@/lib/seo";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMyPilotPortalFn } from "@/lib/pilot/pilot.functions";
import {
  availableCheckpoints,
  pilotStatusLabel,
  willingnessLabel,
  PILOT_CHECKPOINTS,
} from "@/lib/pilot/pilot.model";
import { PilotCheckpointForm } from "@/components/pilot/PilotCheckpointForm";
import { aiExperienceLabel, availabilityLabel } from "@/lib/pilot/pilot.onboarding";
import { INVITE_QUERY_PARAM } from "@/lib/pilot/pilot.invites";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";


export const Route = createFileRoute("/_app/pilot_/portal")({
  head: () => privateHead("Your pilot portal"),
  component: PilotPortalPage,
});

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function PilotPortalPage() {
  const session = useSupabaseSession();
  const fetchPortal = useServerFn(getMyPilotPortalFn);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pilot", "portal"],
    queryFn: () => fetchPortal(),
    enabled: Boolean(session),
  });

  if (session === undefined || (session && isLoading)) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <EmptyState
          title="Sign in to open your pilot portal"
          description="Your portal shows your own seat, intake and checkpoint answers, so it needs your account."
          action={
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <EmptyState
          title="We could not load your portal"
          description={error instanceof Error ? error.message : "Please try again in a moment."}
        />
      </div>
    );
  }

  const invitation = data?.invitation ?? null;
  const profile = data?.profile ?? null;
  const checkpoints = data?.checkpoints ?? [];
  const useCases = data?.useCases ?? [];
  const progress = data?.progress ?? null;
  const openCheckpoints = progress
    ? availableCheckpoints(
        progress,
        checkpoints.map((c) => c.checkpoint),
      )
    : [];


  if (!invitation) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <EmptyState
          title="No pilot seat found for this account"
          description="This portal opens once you claim a pilot invitation. If you were invited, open the link in your invitation email while signed in with that address."
          action={
            <Button asChild variant="outline">
              <Link to="/pilot" search={{ [INVITE_QUERY_PARAM]: undefined }}>Go to the pilot mission</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Pilot participant portal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {invitation.fullName?.trim() || invitation.email}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Everything the {data?.cohort} pilot holds about you, in one place. To change an answer,
          resubmit the intake or a checkpoint from the mission page.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
            Your seat
          </CardTitle>
          <Badge variant="secondary">{pilotStatusLabel(invitation.status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Work email" value={invitation.email} />
            <Field label="Organisation" value={invitation.organization} />
            <Field label="Invited" value={formatDate(invitation.invitedAt)} />
            <Field label="Activated" value={formatDate(invitation.activatedAt)} />
          </dl>
          {progress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mission progress</span>
                <span className="font-medium text-foreground">
                  {progress.completedSteps} of {progress.totalSteps} steps
                </span>
              </div>
              <Progress value={progress.percent} aria-label="Mission progress" />
              <Button asChild size="sm" variant="outline">
                <Link to="/pilot" search={{ [INVITE_QUERY_PARAM]: undefined }}>Continue the mission</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            Your mission steps
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Five steps, each measured from what you actually complete. Pick up wherever you left
            off.
          </p>
        </CardHeader>
        <CardContent>
          {progress?.steps?.length ? (
            <ol className="space-y-3">
              {progress.steps.map((step) => (
                <li
                  key={step.key}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
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
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.helper}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Math.min(step.count, step.target)} of {step.target} complete
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant={step.done ? "ghost" : "default"}>
                    <Link to={step.to}>{step.done ? "Review" : step.cta}</Link>
                  </Button>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Your mission has not started yet"
              description="Complete the intake on the mission page and your five steps will appear here."
              action={
                <Button asChild size="sm">
                  <Link to="/pilot" search={{ [INVITE_QUERY_PARAM]: undefined }}>
                    Open the mission
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {openCheckpoints.length > 0 && (
        <section className="space-y-4" aria-label="Checkpoints due">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Checkpoints due now
            </h2>
            <p className="text-sm text-muted-foreground">
              These unlocked from the steps you have finished. Your answers are the pilot evidence.
            </p>
          </div>
          {openCheckpoints.map((checkpoint) => (
            <PilotCheckpointForm
              key={checkpoint.key}
              checkpoint={checkpoint}
              missionStep={progress?.nextStep?.key ?? null}
              references={{ useCaseIds: useCases.map((uc) => uc.id).slice(0, 10), portfolioId: null }}
            />
          ))}
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden="true" />
            Your Pro workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {workspace?.name
              ? `Your seat is working inside “${workspace.name}”. Everything you create stays in this workspace.`
              : "Your workspace is created the moment you finish onboarding. Complete the intake to activate it."}
          </p>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Use cases</dt>
              <dd className="text-2xl font-semibold text-foreground">
                {workspace?.useCaseCount ?? 0}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Scores run</dt>
              <dd className="text-2xl font-semibold text-foreground">
                {workspace?.scoreCount ?? 0}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Portfolios</dt>
              <dd className="text-2xl font-semibold text-foreground">
                {workspace?.portfolioCount ?? 0}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/my-use-cases">Projects</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/feasibility">Scoring</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/portfoliox">Portfolio</Link>
            </Button>
            {!workspace?.id && (
              <Button asChild size="sm" variant="ghost">
                <Link to="/onboarding">Finish onboarding</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            Your onboarding intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" value={profile.fullName} />
              <Field label="Role" value={profile.roleTitle} />
              <Field label="Organisation" value={profile.organization} />
              <Field label="Sector" value={profile.sector} />
              <Field label="Country" value={profile.country} />
              <Field label="Team size" value={profile.teamSize} />
              <Field label="AI experience" value={aiExperienceLabel(profile.aiExperience)} />
              <Field label="Weekly availability" value={availabilityLabel(profile.availability)} />
              <Field label="Submitted" value={formatDate(profile.completedAt)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Primary goal" value={profile.primaryGoal} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Expected use cases" value={profile.expectedUseCases} />
              </div>
            </dl>
          ) : (
            <EmptyState
              title="You have not completed the intake yet"
              description="The short intake tells us your role, sector and what you want out of the pilot. It takes about two minutes."
              action={
                <Button asChild size="sm">
                  <Link to="/pilot" search={{ [INVITE_QUERY_PARAM]: undefined }}>Complete the intake</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden="true" />
            Your use cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {useCases.length ? (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {useCases.map((uc) => (
                <li key={`${uc.origin}-${uc.id}`} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{uc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {uc.origin === "studio" ? "Studio draft" : "Repository submission"} · updated{" "}
                      {formatDate(uc.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {uc.status ? <Badge variant="outline">{uc.status}</Badge> : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link to={uc.href}>Open</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No use cases yet"
              description="Use cases you create in the Studio, or submit to the repository, appear here."
              action={
                <Button asChild size="sm">
                  <Link to="/ai-use-case-studio">Start a use case</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareQuote className="h-4 w-4 text-primary" aria-hidden="true" />
            Your checkpoint responses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkpoints.length ? (
            <ol className="space-y-4">
              {checkpoints.map((response) => {
                const meta = PILOT_CHECKPOINTS.find((c) => c.key === response.checkpoint);
                return (
                  <li key={response.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {meta?.title ?? response.checkpoint}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(response.createdAt)}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field
                        label="Overall rating"
                        value={response.rating ? `${response.rating} / 5` : null}
                      />
                      <Field
                        label="Value rating"
                        value={response.valueRating ? `${response.valueRating} / 5` : null}
                      />
                      <Field
                        label="Willingness to pay"
                        value={response.willingness ? willingnessLabel(response.willingness) : null}
                      />
                    </dl>
                    {response.comment ? (
                      <p className="mt-3 text-sm text-muted-foreground">“{response.comment}”</p>
                    ) : null}
                    {response.blocked ? (
                      <Badge variant="destructive" className="mt-3">
                        Reported as blocked
                      </Badge>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              title="No checkpoint answers yet"
              description="Checkpoints unlock as you move through the mission. Your answers are what turn the pilot into evidence."
              action={
                <Button asChild size="sm">
                  <Link to="/pilot" search={{ [INVITE_QUERY_PARAM]: undefined }}>Open the mission</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
