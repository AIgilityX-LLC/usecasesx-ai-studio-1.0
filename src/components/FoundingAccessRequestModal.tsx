import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Crown, Loader2 } from "lucide-react";

import { submitFoundingAccessRequestFn } from "@/lib/founding-access.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  workEmail: z.string().trim().email("Enter a valid work email").max(320),
  organization: z.string().trim().min(1, "Organization is required").max(200),
  roleTitle: z.string().trim().max(120).optional(),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof FormSchema>, string>>;

export type FoundingAccessRequestModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Pre-signup lead capture for Early Gratis (Pro) Access.
 * Submits a review request — does not grant access or navigate away.
 */
export function FoundingAccessRequestModal({ open, onClose }: FoundingAccessRequestModalProps) {
  const submit = useServerFn(submitFoundingAccessRequestFn);
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setWorkEmail("");
    setOrganization("");
    setRoleTitle("");
    setErrors({});
    setFormError(null);
    setSubmitting(false);
    setSuccess(false);
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = FormSchema.safeParse({
      fullName,
      workEmail,
      organization,
      roleTitle: roleTitle || undefined,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await submit({
        data: {
          fullName: parsed.data.fullName,
          workEmail: parsed.data.workEmail,
          organization: parsed.data.organization,
          roleTitle: parsed.data.roleTitle ?? null,
        },
      });
      setSuccess(true);
      void import("@/lib/usecasex.tracking").then(({ trackCTAEvent }) =>
        trackCTAEvent("founding_access_requested", {
          source_page: typeof window !== "undefined" ? window.location.pathname : "/",
          location: "founding_access_modal",
        }),
      );
    } catch {
      setFormError("We could not submit your request. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" aria-hidden />
            Request Early Gratis (Pro) Access
          </DialogTitle>
          <DialogDescription>
            Tell us a little about you. Our team reviews every request before inviting you — this
            does not create an account yet.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-foreground"
          >
            <p className="font-semibold">Thanks — our team will review your request and email you shortly.</p>
            <p className="mt-2 text-muted-foreground">
              You will receive an invitation link at your work email if approved. No password is
              sent by email.
            </p>
            <Button type="button" className="mt-4 w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field
              id="far-name"
              label="Full name"
              value={fullName}
              onChange={setFullName}
              error={errors.fullName}
              autoComplete="name"
              required
            />
            <Field
              id="far-email"
              label="Work email"
              type="email"
              value={workEmail}
              onChange={setWorkEmail}
              error={errors.workEmail}
              autoComplete="email"
              required
            />
            <Field
              id="far-org"
              label="Organization"
              value={organization}
              onChange={setOrganization}
              error={errors.organization}
              autoComplete="organization"
              required
            />
            <Field
              id="far-role"
              label="Role / title (optional)"
              value={roleTitle}
              onChange={setRoleTitle}
              error={errors.roleTitle}
              autoComplete="organization-title"
            />
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                "Submit request"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error ? (
        <p id={`${id}-err`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
