/**
 * Inline Founding Access pilot application for the landing page.
 *
 * Posts to the same server function as /pilot/apply, so every submission
 * lands in the pilot application review queue (never a seat directly).
 */

import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, Loader2, Lock } from "lucide-react";

import { submitPilotApplicationFn } from "@/lib/pilot/pilot.functions";
import { PilotApplicationSchema, isWorkEmail } from "@/lib/pilot/pilot.applications";
import { trackCTAEvent } from "@/lib/usecasex.tracking";

const SECTORS = [
  "Financial services",
  "Insurance",
  "Healthcare & life sciences",
  "Government & public sector",
  "Manufacturing",
  "Retail & consumer",
  "Energy & utilities",
  "Telecom & technology",
  "Education & training",
  "Professional services",
  "Other",
];

type FormState = {
  fullName: string;
  email: string;
  organization: string;
  roleTitle: string;
  sector: string;
  goals: string;
};

const EMPTY: FormState = {
  fullName: "",
  email: "",
  organization: "",
  roleTitle: "",
  sector: "",
  goals: "",
};

export function PilotLeadForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);
  const submit = useServerFn(submitPilotApplicationFn);

  const mutation = useMutation({
    mutationFn: (values: FormState) => submit({ data: { ...values, country: "" } }),
    onSuccess: (result) => {
      trackCTAEvent("pilot_application_submitted", {
        source_page: "/",
        location: "landing_pilot_form",
        status: result.status,
      });
    },
  });

  const set = (key: keyof FormState) => (value: string) => {
    if (!started) {
      setStarted(true);
      trackCTAEvent("pilot_form_started", { source_page: "/", location: "landing_pilot_form" });
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = PilotApplicationSchema.safeParse(form);
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
    } else if (!isWorkEmail(parsed.data.email)) {
      next.email = "Please use your work email address, not a personal mailbox.";
    }
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    mutation.mutate(form);
  }

  if (mutation.isSuccess) {
    return (
      <div className="ux-lead-card ux-lead-success" role="status" aria-live="polite">
        <CheckCircle2 size={34} aria-hidden />
        <h3>You’re on the list.</h3>
        <p>{mutation.data.message}</p>
        <p className="ux-lead-muted">
          While you wait, browse the public use-case library — no account needed.
        </p>
        <Link className="ux-button ux-button-dark ux-button-small" to="/repository">
          Explore the library <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    );
  }

  const err = (key: keyof FormState) => errors[key] || undefined;

  return (
    <form className="ux-lead-card" onSubmit={onSubmit} noValidate aria-labelledby="pilot-form-title">
      <div className="ux-lead-head">
        <h3 id="pilot-form-title">Apply for a founding seat</h3>
        <span>Takes about 2 minutes</span>
      </div>

      {mutation.isError ? (
        <div className="ux-lead-alert" role="alert">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "We couldn’t send your application. Please try again."}
        </div>
      ) : null}

      <div className="ux-lead-grid">
        <Field id="lead-name" label="Full name" error={err("fullName")}>
          <input
            id="lead-name"
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => set("fullName")(e.target.value)}
            aria-invalid={Boolean(err("fullName"))}
            aria-describedby={err("fullName") ? "lead-name-error" : undefined}
          />
        </Field>
        <Field id="lead-email" label="Work email" error={err("email")}>
          <input
            id="lead-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            aria-invalid={Boolean(err("email"))}
            aria-describedby={err("email") ? "lead-email-error" : undefined}
          />
        </Field>
        <Field id="lead-org" label="Organisation" error={err("organization")}>
          <input
            id="lead-org"
            autoComplete="organization"
            value={form.organization}
            onChange={(e) => set("organization")(e.target.value)}
            aria-invalid={Boolean(err("organization"))}
            aria-describedby={err("organization") ? "lead-org-error" : undefined}
          />
        </Field>
        <Field id="lead-role" label="Role (optional)" error={err("roleTitle")}>
          <input
            id="lead-role"
            autoComplete="organization-title"
            value={form.roleTitle}
            onChange={(e) => set("roleTitle")(e.target.value)}
          />
        </Field>
        <Field id="lead-sector" label="Sector (optional)" error={err("sector")} wide>
          <select
            id="lead-sector"
            value={form.sector}
            onChange={(e) => set("sector")(e.target.value)}
          >
            <option value="">Select a sector</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="lead-goals"
          label="What AI decision do you want to make in the pilot?"
          error={err("goals")}
          wide
        >
          <textarea
            id="lead-goals"
            rows={3}
            placeholder="e.g. Prioritise 5 customer-service AI ideas into a funded roadmap for Q1."
            value={form.goals}
            onChange={(e) => set("goals")(e.target.value)}
            aria-invalid={Boolean(err("goals"))}
            aria-describedby={err("goals") ? "lead-goals-error" : undefined}
          />
        </Field>
      </div>

      <button
        type="submit"
        className="ux-button ux-button-gold ux-lead-submit"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden /> Sending application…
          </>
        ) : (
          <>
            Request my pilot seat <ArrowRight size={16} aria-hidden />
          </>
        )}
      </button>
      <p className="ux-lead-fine">
        <Lock size={12} aria-hidden /> Work email required. Every application is reviewed by our
        team. No payment details. See our{" "}
        <Link to="/privacy" className="ux-lead-link">
          privacy notice
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  wide,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`ux-lead-field${wide ? " is-wide" : ""}${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="ux-lead-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
