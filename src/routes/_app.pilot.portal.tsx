/**
 * Pilot participant portal.
 *
 * A read-only mirror of everything the pilot holds about the signed-in
 * participant: their seat, the onboarding intake they submitted, the use cases
 * they own, and every checkpoint answer they gave. Nothing here is editable —
 * the mission page at /pilot owns the write paths.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, ClipboardList, Compass, MessageSquareQuote } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMyPilotPortalFn } from "@/lib/pilot/pilot.functions";
import { pilotStatusLabel, willingnessLabel, PILOT_CHECKPOINTS } from "@/lib/pilot/pilot.model";
import { aiExperienceLabel, availabilityLabel } from "@/lib/pilot/pilot.onboarding";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/pilot/portal")({
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
