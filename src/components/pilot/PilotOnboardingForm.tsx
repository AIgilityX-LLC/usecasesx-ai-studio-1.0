/**
 * Participant onboarding intake for the Founding Access pilot.
 *
 * Shown on the participant's pilot page once a seat is claimed. Submitting it
 * activates the seat, so the cohort report reflects real enrolment rather than
 * an invitation that nobody ever opened.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PILOT_AI_EXPERIENCE,
  PILOT_AVAILABILITY,
  PILOT_SECTORS,
  PILOT_TEAM_SIZES,
  PilotOnboardingSchema,
  aiExperienceLabel,
  availabilityLabel,
  onboardingDefaults,
  type PilotOnboardingInput,
} from "@/lib/pilot/pilot.onboarding";
import {
  getMyPilotOnboardingFn,
  savePilotOnboardingFn,
} from "@/lib/pilot/pilot.functions";

export function PilotOnboardingForm() {
  const load = useServerFn(getMyPilotOnboardingFn);
  const save = useServerFn(savePilotOnboardingFn);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<PilotOnboardingInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const intake = useQuery({
    queryKey: ["my-pilot-onboarding"],
    queryFn: () => load(),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: (input: PilotOnboardingInput) => save({ data: input }),
    onSuccess: (result) => {
      setEditing(false);
      setErrors({});
      toast.success(result.activated ? "You're enrolled in the pilot" : "Onboarding saved", {
        description: result.activated
          ? "Your seat is now active. Start with step one of the mission below."
          : "Your details have been updated.",
      });
      void queryClient.invalidateQueries({ queryKey: ["my-pilot-onboarding"] });
      void queryClient.invalidateQueries({ queryKey: ["my-pilot"] });
    },
    onError: (error: unknown) =>
      toast.error("We could not save your onboarding", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  if (intake.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (intake.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>We could not load your onboarding</AlertTitle>
        <AlertDescription>
          {intake.error instanceof Error ? intake.error.message : "Please try again."}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => void intake.refetch()}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const profile = intake.data?.profile ?? null;
  const invitation = intake.data?.invitation ?? null;
  const showForm = editing || !profile;
  const form =
    values ??
    (profile
      ? ({ ...profile } as PilotOnboardingInput)
      : onboardingDefaults({
          fullName: invitation?.fullName ?? null,
          organization: invitation?.organization ?? null,
        }));

  const set = <K extends keyof PilotOnboardingInput>(key: K, value: PilotOnboardingInput[K]) =>
    setValues({ ...form, [key]: value });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = PilotOnboardingSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please check the highlighted fields");
      return;
    }
    setErrors({});
    submit.mutate(parsed.data);
  }

  const fieldError = (key: keyof PilotOnboardingInput) => errors[key as string];

  return (
    <Card id="pilot-onboarding">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" aria-hidden /> Pilot onboarding
          {profile && (
            <Badge variant="secondary" className="ml-1">
              <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden /> Complete
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {profile
            ? "Your enrolment details. Update them any time — your facilitator sees the latest version."
            : "Two minutes, and your seat becomes active. This tells us who is in the cohort and what outcome you came for."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!invitation && (
          <Alert>
            <AlertTitle>No invited seat matched this account yet</AlertTitle>
            <AlertDescription>
              You can still complete onboarding. Open your invitation link to attach the seat, and
              your answers here carry over.
            </AlertDescription>
          </Alert>
        )}

        {!showForm && profile ? (
          <div className="space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Name" value={profile.fullName} />
              <Detail label="Role" value={profile.roleTitle} />
              <Detail label="Organisation" value={profile.organization} />
              <Detail label="Sector" value={profile.sector} />
              <Detail label="Country" value={profile.country ?? "—"} />
              <Detail label="Team size" value={profile.teamSize ?? "—"} />
              <Detail label="AI maturity" value={aiExperienceLabel(profile.aiExperience)} />
              <Detail label="Time available" value={availabilityLabel(profile.availability)} />
            </dl>
            <Detail label="What you want from the pilot" value={profile.primaryGoal} />
            {profile.expectedUseCases && (
              <Detail label="Use cases you plan to bring" value={profile.expectedUseCases} />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setValues({ ...profile } as PilotOnboardingInput);
                setEditing(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" aria-hidden /> Update details
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="pilot-name" error={fieldError("fullName")}>
                <Input
                  id="pilot-name"
                  value={form.fullName}
                  maxLength={120}
                  autoComplete="name"
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </Field>
              <Field label="Role or job title" htmlFor="pilot-role" error={fieldError("roleTitle")}>
                <Input
                  id="pilot-role"
                  value={form.roleTitle}
                  maxLength={140}
                  autoComplete="organization-title"
                  onChange={(e) => set("roleTitle", e.target.value)}
                />
              </Field>
              <Field label="Organisation" htmlFor="pilot-org" error={fieldError("organization")}>
                <Input
                  id="pilot-org"
                  value={form.organization}
                  maxLength={160}
                  autoComplete="organization"
                  onChange={(e) => set("organization", e.target.value)}
                />
              </Field>
              <Field label="Sector" htmlFor="pilot-sector" error={fieldError("sector")}>
                <Select
                  value={form.sector}
                  onValueChange={(v) => set("sector", v as PilotOnboardingInput["sector"])}
                >
                  <SelectTrigger id="pilot-sector">
                    <SelectValue placeholder="Choose a sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {PILOT_SECTORS.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Country (optional)" htmlFor="pilot-country">
                <Input
                  id="pilot-country"
                  value={form.country ?? ""}
                  maxLength={80}
                  autoComplete="country-name"
                  onChange={(e) => set("country", e.target.value || null)}
                />
              </Field>
              <Field label="Team size (optional)" htmlFor="pilot-team">
                <Select
                  value={form.teamSize ?? undefined}
                  onValueChange={(v) => set("teamSize", v as PilotOnboardingInput["teamSize"])}
                >
                  <SelectTrigger id="pilot-team">
                    <SelectValue placeholder="Choose a range" />
                  </SelectTrigger>
                  <SelectContent>
                    {PILOT_TEAM_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Where is your organisation with AI?"
                htmlFor="pilot-experience"
                error={fieldError("aiExperience")}
              >
                <Select
                  value={form.aiExperience}
                  onValueChange={(v) => set("aiExperience", v)}
                >
                  <SelectTrigger id="pilot-experience">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    {PILOT_AI_EXPERIENCE.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Time available over the pilot (optional)" htmlFor="pilot-availability">
                <Select
                  value={form.availability ?? undefined}
                  onValueChange={(v) => set("availability", v)}
                >
                  <SelectTrigger id="pilot-availability">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    {PILOT_AVAILABILITY.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label="What do you want out of the pilot?"
              htmlFor="pilot-goal"
              error={fieldError("primaryGoal")}
            >
              <Textarea
                id="pilot-goal"
                rows={3}
                maxLength={1000}
                value={form.primaryGoal}
                placeholder="e.g. Build a defensible shortlist of three AI use cases for our 2027 budget submission."
                onChange={(e) => set("primaryGoal", e.target.value)}
              />
            </Field>

            <Field label="Use cases you plan to bring (optional)" htmlFor="pilot-cases">
              <Textarea
                id="pilot-cases"
                rows={2}
                maxLength={1000}
                value={form.expectedUseCases ?? ""}
                onChange={(e) => set("expectedUseCases", e.target.value || null)}
              />
            </Field>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                id="pilot-consent"
                checked={form.contactConsent}
                onCheckedChange={(checked) => set("contactConsent", checked === true)}
              />
              <Label htmlFor="pilot-consent" className="text-sm font-normal leading-snug">
                A facilitator may contact me about my pilot progress and a short debrief. Your
                answers stay inside the pilot programme.
              </Label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending
                  ? "Saving…"
                  : profile
                    ? "Save changes"
                    : "Complete onboarding"}
              </Button>
              {profile && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setValues(null);
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
