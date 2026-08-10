import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { completeOnboardingFn, getOnboardingStateFn } from "@/lib/onboarding.functions";
import { PRODUCT_EVENTS, recordProductEvent } from "@/lib/telemetry";
import { FoundingAccessBanner } from "@/components/FoundingAccessBanner";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Get started — UseCasesX™" },
      {
        name: "description",
        content:
          "Set up your AI Opportunity workspace in four short steps and reach your first prioritized use case.",
      },
      { property: "og:title", content: "Get started — UseCasesX™" },
      {
        property: "og:description",
        content: "Four short steps to your first prioritized AI use case portfolio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

const DRAFT_KEY = "ucx.onboarding.draft.v1";

const PURPOSES = [
  { id: "discover", label: "Explore proven AI use cases", hint: "Start from the repository." },
  { id: "prioritize", label: "Prioritize an AI shortlist", hint: "Score and rank opportunities." },
  { id: "build_case", label: "Build a business case", hint: "Value, risk and feasibility." },
  { id: "board_report", label: "Report to leadership", hint: "Board-ready portfolio export." },
];

const ROLES = [
  "Executive / C-Suite",
  "Director / VP",
  "Manager",
  "Practitioner",
  "Advisor / Consultant",
  "Researcher",
  "Other",
];

const INDUSTRIES = [
  "Defense & National Security",
  "Public Sector & Government",
  "Healthcare & Life Sciences",
  "Banking & Capital Markets",
  "Insurance",
  "Energy & Utilities",
  "Manufacturing & Industrial",
  "Telecommunications",
  "Retail & Consumer",
  "Transportation & Logistics",
  "Education",
  "Professional Services",
  "Technology & Software",
  "Media & Entertainment",
];

const FUNCTIONS = [
  "Operations",
  "Finance",
  "Customer Service",
  "Sales & Marketing",
  "HR & People",
  "IT & Engineering",
  "Supply Chain",
  "Risk & Compliance",
  "Legal",
  "Procurement",
];

const OUTCOMES = [
  "Productivity",
  "Cost reduction",
  "Revenue growth",
  "Risk & compliance",
  "Customer experience",
  "AI strategy & governance",
];

type Draft = {
  purpose: string;
  fullName: string;
  organizationName: string;
  workspaceName: string;
  role: string;
  country: string;
  industry: string;
  functions: string[];
  outcome: string;
};

const EMPTY: Draft = {
  purpose: "",
  fullName: "",
  organizationName: "",
  workspaceName: "",
  role: "",
  country: "",
  industry: "",
  functions: [],
  outcome: "",
};

const STEPS = ["Your goal", "You & organization", "Focus", "First outcome"] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const loadState = useServerFn(getOnboardingStateFn);
  const complete = useServerFn(completeOnboardingFn);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore any local draft so a refresh never loses answers.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft((d) => ({ ...d, ...(JSON.parse(raw) as Partial<Draft>) }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable */
    }
  }, [draft]);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    let active = true;
    (async () => {
      try {
        const state = await loadState();
        if (!active) return;
        if (state.completed) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        setDraft((d) => ({
          ...d,
          fullName: d.fullName || state.profile.fullName,
          organizationName: d.organizationName || state.profile.organization,
          role: d.role || state.profile.role,
          country: d.country || state.profile.country,
          industry: d.industry || state.profile.industry,
          outcome: d.outcome || state.profile.outcome,
        }));
        setLoading(false);
        if (!startedRef.current) {
          startedRef.current = true;
          void recordProductEvent({ event: PRODUCT_EVENTS.onboardingStarted });
        }
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load your setup.");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, navigate, loadState]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const canAdvance = useMemo(() => {
    if (step === 0) return draft.purpose !== "";
    if (step === 1) return draft.fullName.trim() !== "" && draft.organizationName.trim() !== "";
    if (step === 2) return draft.industry !== "";
    return draft.outcome !== "";
  }, [step, draft]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleFunction = (name: string) =>
    setDraft((d) => ({
      ...d,
      functions: d.functions.includes(name)
        ? d.functions.filter((f) => f !== name)
        : [...d.functions, name],
    }));

  const skip = () => {
    void recordProductEvent({
      event: PRODUCT_EVENTS.onboardingSkipped,
      properties: { step: STEPS[step] },
    });
    navigate({ to: "/repository" });
  };

  const finish = async () => {
    setError(null);
    setSaving(true);
    try {
      const result = await complete({
        data: {
          fullName: draft.fullName,
          purpose: draft.purpose,
          organizationName: draft.organizationName,
          workspaceName: draft.workspaceName || null,
          role: draft.role || null,
          country: draft.country || null,
          industry: draft.industry || null,
          functions: draft.functions,
          outcome: draft.outcome || null,
        },
      });
      void recordProductEvent({
        event: PRODUCT_EVENTS.onboardingCompleted,
        entity: { type: "workspace", id: result.workspaceId },
        properties: {
          purpose: draft.purpose,
          industry: draft.industry,
          functions: draft.functions,
          outcome: draft.outcome,
        },
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* storage unavailable */
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your setup. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (session === undefined || loading) {
    return (
      <div
        className="mx-auto max-w-3xl px-6 py-20 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Preparing your workspace…
      </div>
    );
  }

  return (
    <section className="bg-secondary/30">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Get started · Step {step + 1} of {STEPS.length}
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-2xl font-bold tracking-tight outline-none sm:text-3xl"
        >
          {step === 0 && "What brings you to UseCasesX?"}
          {step === 1 && "Tell us who you are"}
          {step === 2 && "Where should we focus?"}
          {step === 3 && "What outcome matters most?"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This takes under a minute and personalizes your repository, scoring and portfolio.
        </p>

        <div
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Onboarding progress"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          {step === 0 && (
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Your goal</legend>
              {PURPOSES.map((p) => {
                const active = draft.purpose === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("purpose", p.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div className="text-sm font-semibold text-foreground">{p.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.hint}</p>
                  </button>
                );
              })}
            </fieldset>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <Field label="Full name" required>
                <input
                  required
                  value={draft.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  className={inputCls}
                  autoComplete="name"
                />
              </Field>
              <Field label="Organization" required>
                <input
                  required
                  value={draft.organizationName}
                  onChange={(e) => set("organizationName", e.target.value)}
                  className={inputCls}
                  autoComplete="organization"
                />
              </Field>
              <Field
                label="Workspace name"
                hint="Optional — defaults to your organization's first workspace."
              >
                <input
                  value={draft.workspaceName}
                  onChange={(e) => set("workspaceName", e.target.value)}
                  className={inputCls}
                  placeholder="Default Workspace"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role">
                  <select
                    value={draft.role}
                    onChange={(e) => set("role", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select…</option>
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Country">
                  <input
                    value={draft.country}
                    onChange={(e) => set("country", e.target.value)}
                    className={inputCls}
                    autoComplete="country-name"
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <Field label="Primary industry" required>
                <select
                  value={draft.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <fieldset>
                <legend className="text-sm font-semibold text-foreground">
                  Business functions
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Optional · pick any that apply
                  </span>
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FUNCTIONS.map((f) => {
                    const active = draft.functions.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleFunction(f)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Desired outcome</legend>
                {OUTCOMES.map((o) => {
                  const active = draft.outcome === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={active}
                      onClick={() => set("outcome", o)}
                      className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${
                        active
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </fieldset>
              <FoundingAccessBanner sourcePage="/onboarding" />
            </div>
          )}

          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canAdvance}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                Continue <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAdvance || saving}
                onClick={finish}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                {saving ? "Setting up…" : "Finish setup"}
              </button>
            )}
            <button
              type="button"
              onClick={skip}
              className="ml-auto text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline"
            >
              Skip for now
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can change any of this later in{" "}
          <Link to="/account" className="font-semibold text-primary hover:underline">
            your account settings
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}
