import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { saveLeadCapture, type LeadCapturePayload } from "@/lib/leadCapture";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { isEligibleEmail, FOUNDING_UNTIL_LABEL } from "@/lib/entitlements";

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------
export type LeadTriggerCase =
  | "lite-pdf"
  | "ai-strategy-session"
  | "custom-use-case"
  | "governance-review"
  | "ai-opportunity-workshop"
  | "sector-pack"
  | "founding-member";

export const INTEREST_AREAS = [
  "Lite PDF Download",
  "AI Strategy Session",
  "Sector Use Case Pack",
  "Governance Review",
  "AI Readiness",
  "AI ROI",
  "SARPI Tracking",
  "CyberX Governance",
  "AdvisorX Advisory",
  "FlowX Workflow",
  "Founding Member Waitlist",
] as const;
export type InterestArea = (typeof INTEREST_AREAS)[number];

export interface LeadCaptureProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (lead: LeadCapturePayload & { id: string }) => void;
  /** Use-case-specific trigger (drives copy + success behavior). */
  triggerCase?: LeadTriggerCase;
  /** Legacy alias — accepted for back-compat with existing call sites. */
  cta?: string;
  title?: string;
  description?: string;
  sourceUseCase?: string;
  /** UUID of the source use case (for Supabase relations). */
  sourceUseCaseId?: string;
  /** Optional title used by the Lite PDF preview. */
  sourceUseCaseTitle?: string;
  sourcePage?: string;
  /** Pre-fill the interest area dropdown. */
  defaultInterestArea?: InterestArea;
}

// -----------------------------------------------------------------------------
// Trigger copy
// -----------------------------------------------------------------------------
const TRIGGERS: Record<
  LeadTriggerCase,
  { title: string; description: string; cta: string; success: string; interest: InterestArea }
> = {
  "lite-pdf": {
    title: "Download the Lite PDF",
    description: "Share a few details and we'll unlock the Lite report for this use case.",
    cta: "Unlock & Download",
    success: "Your Lite PDF is ready — the download will start automatically.",
    interest: "Lite PDF Download",
  },
  "ai-strategy-session": {
    title: "Request an AI Strategy Session",
    description:
      "Tell us about your priorities and an AIgilityX advisor will reach out to schedule a session.",
    cta: "Request Session",
    success: "Thank you. AIgilityX team will contact you for the next step.",
    interest: "AI Strategy Session",
  },
  "custom-use-case": {
    title: "Request a Custom Use Case",
    description:
      "Describe the AI use case you're exploring — we'll draft one tailored to your context.",
    cta: "Request Custom Use Case",
    success: "Thank you. AIgilityX team will draft your custom use case and follow up.",
    interest: "Sector Use Case Pack",
  },
  "governance-review": {
    title: "Request a Governance Review",
    description: "Route this use case into CyberX C3G for an independent governance review.",
    cta: "Request Governance Review",
    success: "Thank you. AIgilityX team will contact you for the next step.",
    interest: "Governance Review",
  },
  "ai-opportunity-workshop": {
    title: "Request an AI Opportunity Workshop",
    description: "A facilitated session to map AI opportunities across your business.",
    cta: "Request Workshop",
    success: "Thank you. AIgilityX team will reach out to schedule your workshop.",
    interest: "AI Strategy Session",
  },
  "sector-pack": {
    title: "Request a Sector Use Case Pack",
    description: "A curated pack of AI use cases tailored to your industry and priorities.",
    cta: "Request Sector Pack",
    success: "Thank you. Your sector pack will be sent shortly.",
    interest: "Sector Use Case Pack",
  },
  "founding-member": {
    title: "Join the Founding Member Waitlist",
    description:
      "Reserve free Pro access — gratis until 31 Dec 2026 for eligible founding members. Tell us a little about you and we'll confirm your early-access spot.",
    cta: "Join the Waitlist",
    success:
      "You're on the Founding Member waitlist. We'll email you to confirm your free SARPI Pro access (gratis until 31 Dec 2026).",
    interest: "Founding Member Waitlist",
  },
};

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------
const Schema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  organization: z.string().trim().max(200).optional(),
  role: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  industry: z.string().trim().max(120).optional(),
  interestArea: z.enum(INTEREST_AREAS).optional(),
  message: z.string().trim().max(2000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});
type FormState = z.input<typeof Schema>;

const EMPTY: FormState = {
  fullName: "",
  email: "",
  organization: "",
  role: "",
  country: "",
  industry: "",
  interestArea: undefined,
  message: "",
  consent: false as unknown as true,
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export function LeadCaptureModal(props: LeadCaptureProps) {
  const {
    open,
    onClose,
    onSuccess,
    triggerCase: triggerCaseProp,
    cta: ctaProp,
    title: titleOverride,
    description: descriptionOverride,
    sourceUseCase,
    sourceUseCaseId,
    sourceUseCaseTitle,
    sourcePage,
    defaultInterestArea,
  } = props;

  // Resolve trigger: explicit prop > cta alias > default to lite-pdf.
  const trigger: LeadTriggerCase = useMemo(() => {
    if (triggerCaseProp) return triggerCaseProp;
    const alias = (ctaProp ?? "").toLowerCase();
    if (alias.includes("strategy")) return "ai-strategy-session";
    if (alias.includes("waitlist") || alias.includes("founding")) return "founding-member";
    if (alias.includes("custom")) return "custom-use-case";
    if (alias.includes("governance")) return "governance-review";
    if (alias.includes("workshop")) return "ai-opportunity-workshop";
    if (alias.includes("sector") || alias.includes("pack")) return "sector-pack";
    return "lite-pdf";
  }, [triggerCaseProp, ctaProp]);

  const copy = TRIGGERS[trigger];
  const title = titleOverride ?? copy.title;
  const description = descriptionOverride ?? copy.description;

  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    interestArea: defaultInterestArea ?? copy.interest,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [eligibleResult, setEligibleResult] = useState<boolean | null>(null);

  // Reset on close / trigger change.
  useEffect(() => {
    if (!open) {
      setErrors({});
      setServerError(null);
      setDone(false);
      setSubmitting(false);
      return;
    }
    setForm((f) => ({ ...f, interestArea: defaultInterestArea ?? copy.interest }));
    trackCTAEvent("lead_modal_opened", { trigger, source_use_case: sourceUseCase });
  }, [open, trigger, defaultInterestArea, copy.interest, sourceUseCase]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload: LeadCapturePayload = {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        organization: parsed.data.organization || null,
        role: parsed.data.role || null,
        country: parsed.data.country || null,
        industry: parsed.data.industry || null,
        interestArea: parsed.data.interestArea ?? null,
        message: parsed.data.message || null,
        consent: parsed.data.consent,
        triggerCase: trigger,
        sourceUseCase: sourceUseCase ?? null,
        sourceUseCaseId: sourceUseCaseId ?? null,
        sourcePage: sourcePage ?? (typeof window !== "undefined" ? window.location.pathname : null),
      };

      const result = await saveLeadCapture(payload);
      setEligibleResult(isEligibleEmail(parsed.data.email));
      setReference(result.referenceId);
      setEmailed(result.emailed);
      trackCTAEvent("lead_submitted", {
        trigger,
        interest: payload.interestArea,
        source_use_case: payload.sourceUseCase,
      });

      // Trigger-specific post-submit behavior.
      if (trigger === "lite-pdf") {
        triggerLitePdfDownload(sourceUseCaseTitle ?? sourceUseCase ?? "usecasex");
      }

      setDone(true);
      onSuccess?.({ ...payload, id: result.id });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-capture-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          ✕
        </button>

        {done ? (
          <SuccessView
            triggerCase={trigger}
            message={copy.success}
            eligible={eligibleResult}
            reference={reference}
            emailed={emailed}
            email={form.email}
            onClose={onClose}
          />
        ) : (
          <form onSubmit={onSubmit} noValidate className="px-7 py-7 sm:px-8">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              UseCasesX™ · AIgilityX
            </div>
            <h3 id="lead-capture-title" className="text-xl font-bold text-foreground sm:text-2xl">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                name="fullName"
                label="Full name"
                required
                value={form.fullName}
                onChange={(v) => set("fullName", v)}
                error={errors.fullName}
              />
              <Field
                name="email"
                label="Work email"
                required
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                error={errors.email}
              />
              <Field
                name="organization"
                label="Organization"
                value={form.organization ?? ""}
                onChange={(v) => set("organization", v)}
                error={errors.organization}
              />
              <Field
                name="role"
                label="Role"
                value={form.role ?? ""}
                onChange={(v) => set("role", v)}
                error={errors.role}
              />
              <Field
                name="country"
                label="Country"
                value={form.country ?? ""}
                onChange={(v) => set("country", v)}
                error={errors.country}
              />
              <Field
                name="industry"
                label="Industry"
                value={form.industry ?? ""}
                onChange={(v) => set("industry", v)}
                error={errors.industry}
              />
            </div>

            <SelectField
              name="interestArea"
              label="Interest area"
              value={form.interestArea ?? ""}
              onChange={(v) => set("interestArea", (v || undefined) as InterestArea | undefined)}
              options={INTEREST_AREAS as unknown as string[]}
              error={errors.interestArea}
            />

            <TextareaField
              name="message"
              label="Message or notes"
              value={form.message ?? ""}
              onChange={(v) => set("message", v)}
              error={errors.message}
              placeholder="Anything specific you'd like the AIgilityX team to know."
            />

            <label className="mt-5 flex items-start gap-3 rounded-md border border-border bg-background/40 p-3">
              <input
                type="checkbox"
                checked={!!form.consent}
                onChange={(e) => set("consent", e.target.checked as unknown as true)}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
              />
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                By submitting this form, you agree to be contacted by AIgilityX about relevant AI
                strategy, governance, and transformation resources.
              </span>
            </label>
            {errors.consent && <p className="mt-1 text-xs text-destructive">{errors.consent}</p>}

            {serverError && (
              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {serverError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? "Sending…" : copy.cta + " →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Success view
// -----------------------------------------------------------------------------
function SuccessView({
  triggerCase,
  message,
  eligible,
  onClose,
}: {
  triggerCase: LeadTriggerCase;
  message: string;
  eligible?: boolean | null;
  onClose: () => void;
}) {
  const foundingMsg =
    triggerCase === "founding-member" && eligible != null
      ? eligible
        ? `Great news — your work email qualifies for founding-member access. Sign in with a verified account to unlock Pro gratis until ${FOUNDING_UNTIL_LABEL}.`
        : `You're on the Free Pro waitlist. We'll review your submission and email you about early access.`
      : message;
  return (
    <div className="px-8 py-12 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
        ✓
      </div>
      <h3 className="text-xl font-bold text-foreground">Thank you.</h3>
      <p className="mt-2 text-sm text-muted-foreground">{foundingMsg}</p>
      {triggerCase === "lite-pdf" && (
        <p className="mt-2 text-xs text-muted-foreground">
          If your download doesn't start, check your browser's download bar.
        </p>
      )}
      <button
        onClick={onClose}
        className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
      >
        Close
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Lite PDF trigger (placeholder)
// -----------------------------------------------------------------------------
function triggerLitePdfDownload(label: string) {
  if (typeof window === "undefined") return;
  const safe = label.replace(/[<>&]/g, "");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>UseCasesX Lite — ${safe}</title>
<style>
  @page { size: A4; margin: 24mm; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 4px 0; }
  .eyebrow { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #6366f1; font-weight: 700; }
  h2 { font-size: 14px; margin-top: 20px; text-transform: uppercase; letter-spacing: .1em; color: #334155; }
  p { font-size: 12px; line-height: 1.55; }
  .muted { color: #64748b; font-size: 11px; }
  .actions { margin-top: 24px; }
  button { font: inherit; padding: 8px 14px; border: 1px solid #0f172a; background: #0f172a; color: white; border-radius: 6px; cursor: pointer; }
  @media print { .actions { display: none; } }
</style></head>
<body>
  <header>
    <div class="eyebrow">UseCasesX™ · AIgilityX</div>
    <h1>Lite Report — ${safe}</h1>
    <div class="muted">Generated ${new Date().toLocaleString()}</div>
  </header>
  <h2>Overview</h2>
  <p>This Lite report summarizes the AI use case <strong>${safe}</strong>, including business value, recommended platforms, governance considerations, and indicative ROI.</p>
  <h2>Next steps</h2>
  <p>An AIgilityX advisor will follow up with the full report tailored to your context, including readiness assessment and roadmap.</p>
  <p class="muted">For the full version, request an AI Strategy Session from your UseCasesX dashboard.</p>
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=1000");
  if (w) {
    w.document.write(html);
    w.document.close();
  } else {
    // Fallback to file download if popup is blocked.
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usecasex-lite-${safe.toLowerCase().replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// -----------------------------------------------------------------------------
// Field primitives
// -----------------------------------------------------------------------------
const inputCls =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </span>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  required,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`${inputCls} ${error ? "border-destructive focus:border-destructive focus:ring-destructive/30" : ""}`}
      />
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </label>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: string;
}) {
  return (
    <label className="mt-4 block">
      <FieldLabel>{label}</FieldLabel>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} appearance-none ${error ? "border-destructive" : ""}`}
      >
        <option value="">Select an interest area…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </label>
  );
}

function TextareaField({
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        name={name}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} ${error ? "border-destructive" : ""}`}
      />
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </label>
  );
}
