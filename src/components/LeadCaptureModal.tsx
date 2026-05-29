import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitLead } from "@/lib/use-cases.functions";

export interface LeadCaptureProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
  cta?: string;
  sourceUseCase?: string;
  sourcePage?: string;
}

export function LeadCaptureModal({
  open,
  onClose,
  onSuccess,
  title = "Get the full briefing",
  description = "Tell us a little about you and we'll unlock the Lite report plus a tailored intro from the AIgilityX team.",
  cta = "lite-pdf",
  sourceUseCase,
  sourcePage,
}: LeadCaptureProps) {
  const submit = useServerFn(submitLead);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setDone(false);
    }
  }, [open]);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submit({
        data: {
          fullName: String(fd.get("fullName") ?? ""),
          email: String(fd.get("email") ?? ""),
          company: (fd.get("company") as string) || null,
          role: (fd.get("role") as string) || null,
          country: (fd.get("country") as string) || null,
          industry: (fd.get("industry") as string) || null,
          interestArea: (fd.get("interestArea") as string) || null,
          sourceUseCase: sourceUseCase ?? null,
          sourcePage: sourcePage ?? (typeof window !== "undefined" ? window.location.pathname : null),
          cta,
        },
      });
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          ✕
        </button>

        {done ? (
          <div className="px-8 py-12 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              ✓
            </div>
            <h3 className="text-xl font-bold">You're in.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The AIgilityX team will be in touch shortly. Meanwhile, keep exploring the repository.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="px-8 py-7">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              UseCaseX™ · Free
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field name="fullName" label="Full name *" required />
              <Field name="email" label="Work email *" type="email" required />
              <Field name="company" label="Company" />
              <Field name="role" label="Role" />
              <Field name="country" label="Country" />
              <Field name="industry" label="Industry" />
            </div>
            <Field name="interestArea" label="What are you looking to solve?" textarea />

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">
                By submitting you agree to be contacted by AIgilityX.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Continue →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  textarea,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <label className={textarea ? "mt-3 block" : "block"}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea name={name} rows={3} className={cls} />
      ) : (
        <input name={name} type={type} required={required} className={cls} />
      )}
    </label>
  );
}
