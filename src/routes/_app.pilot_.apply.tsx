/**
 * Public Founding Access pilot application.
 *
 * Anyone can apply; the submission creates a review request, never a seat.
 * Seats are still granted by an admin, so cohort and readiness counts stay
 * evidence-based.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { publicHead } from "@/lib/seo";
import { submitPilotApplicationFn } from "@/lib/pilot/pilot.functions";
import { PilotApplicationSchema, isWorkEmail } from "@/lib/pilot/pilot.applications";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_app/pilot_/apply")({
  head: () =>
    publicHead({
      path: "/pilot/apply",
      title: "Apply for the pilot — UseCasesX™",
      description:
        "Apply for a Founding Access pilot seat: run the AI use case mission end to end, from discovery through scoring to a portfolio export.",
    }),
  component: PilotApplyPage,
});

type FormState = {
  fullName: string;
  email: string;
  organization: string;
  roleTitle: string;
  sector: string;
  country: string;
  goals: string;
};

const EMPTY: FormState = {
  fullName: "",
  email: "",
  organization: "",
  roleTitle: "",
  sector: "",
  country: "",
  goals: "",
};

function PilotApplyPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useServerFn(submitPilotApplicationFn);

  const mutation = useMutation({
    mutationFn: (values: FormState) => submit({ data: values }),
  });

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = PilotApplicationSchema.safeParse(form);
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    } else if (!isWorkEmail(parsed.data.email)) {
      nextErrors["email"] = "Please use your work email address, not a personal mailbox.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    mutation.mutate(form);
  }

  if (mutation.isSuccess) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader className="space-y-2">
            <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
            <CardTitle>Thanks — your application is in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{mutation.data.message}</p>
            <p>
              While you wait you can browse the public repository — no account needed — and see the
              kind of use cases the pilot mission works with.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/repository">Browse the repository</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/launch">What we are launching</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <PageHero
        eyebrow="Founding Access pilot"
        title="Apply for a pilot seat"
        description="A small cohort runs the full mission: capture opportunities, design use cases in the Studio, score them, build a portfolio and export a board-ready summary. Complimentary through 31 December 2026."
      />

      <section className="container mx-auto max-w-2xl px-4 pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardContent>
            {mutation.isError ? (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>We could not submit your application</AlertTitle>
                <AlertDescription>
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Something went wrong. Please try again."}
                </AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <Field
                id="fullName"
                label="Full name"
                value={form.fullName}
                onChange={set("fullName")}
                error={errors["fullName"]}
                required
              />
              <Field
                id="email"
                label="Work email"
                type="email"
                value={form.email}
                onChange={set("email")}
                error={errors["email"]}
                required
              />
              <Field
                id="organization"
                label="Organisation"
                value={form.organization}
                onChange={set("organization")}
                error={errors["organization"]}
                required
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="roleTitle"
                  label="Role"
                  value={form.roleTitle}
                  onChange={set("roleTitle")}
                  error={errors["roleTitle"]}
                />
                <Field
                  id="sector"
                  label="Sector"
                  value={form.sector}
                  onChange={set("sector")}
                  error={errors["sector"]}
                />
              </div>
              <Field
                id="country"
                label="Country"
                value={form.country}
                onChange={set("country")}
                error={errors["country"]}
              />

              <div className="space-y-2">
                <Label htmlFor="goals">
                  What do you want out of the pilot?{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </Label>
                <Textarea
                  id="goals"
                  rows={5}
                  value={form.goals}
                  onChange={(e) => set("goals")(e.target.value)}
                  aria-invalid={Boolean(errors["goals"])}
                  aria-describedby={errors["goals"] ? "goals-error" : undefined}
                  placeholder="For example: shortlist AI opportunities across two business units and take a scored portfolio to our executive committee."
                />
                {errors["goals"] ? (
                  <p id="goals-error" className="text-sm text-destructive">
                    {errors["goals"]}
                  </p>
                ) : null}
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                We use these details only to review your application and set up your pilot
                workspace. Applying does not create an account.
              </p>

              <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  "Apply for a seat"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
