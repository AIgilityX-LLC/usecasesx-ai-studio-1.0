/**
 * "Talk to Our Advisor" flow.
 *
 * A short qualification form (name, work email, organization, focus, timing)
 * that routes the lead into the same lead_captures pipeline used by the
 * waitlist, plus direct scheduling/contact fallbacks so a lead is never stuck
 * behind a form.
 */
import { useEffect, useState } from "react";
import { z } from "zod";
import { CalendarClock, Check, Mail, MessageSquare } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveLeadCapture } from "@/lib/leadCapture";
import { trackCTAEvent } from "@/lib/usecasex.tracking";

export const ADVISOR_EMAIL = "info@aigilityx.com";

const FOCUS_OPTIONS = [
  "AI Strategy Session",
  "AI Readiness",
  "AI ROI",
  "Governance Review",
  "SARPI Tracking",
  "AdvisorX Advisory",
] as const;

const TIMING_OPTIONS = [
  "As soon as possible",
  "This week",
  "Next week",
  "Within the month",
  "Just exploring",
] as const;

const Schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid work email").max(255),
  organization: z.string().trim().min(2, "Organization is required").max(200),
  focus: z.enum(FOCUS_OPTIONS),
  timing: z.enum(TIMING_OPTIONS),
  message: z.string().trim().max(1000).optional(),
});

type Errors = Partial<Record<"fullName" | "email" | "organization" | "message", string>>;

export function AdvisorContactDialog({
  open,
  onOpenChange,
  sourcePage = "/",
  location = "landing_final_cta_advisor",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePage?: string;
  location?: string;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [focus, setFocus] = useState<(typeof FOCUS_OPTIONS)[number]>("AI Strategy Session");
  const [timing, setTiming] = useState<(typeof TIMING_OPTIONS)[number]>("This week");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setErrors({});
    setServerError(null);
    trackCTAEvent("advisor_form_opened", { location, source_page: sourcePage });
  }, [open, location, sourcePage]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    const parsed = Schema.safeParse({ fullName, email, organization, focus, timing, message });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await saveLeadCapture({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        organization: parsed.data.organization,
        interestArea: parsed.data.focus,
        message: [`Preferred timing: ${parsed.data.timing}`, parsed.data.message]
          .filter(Boolean)
          .join("\n\n"),
        consent: true,
        triggerCase: "ai-strategy-session",
        sourcePage,
      });
      trackCTAEvent("advisor_request_submitted", {
        location,
        interest: parsed.data.focus,
        timing: parsed.data.timing,
      });
      setDone(true);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "We could not send your request. Please email us instead.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              <Check className="h-6 w-6" aria-hidden />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">Request received</DialogTitle>
              <DialogDescription className="text-center">
                An AIgilityX advisor will reply to <span className="font-medium">{email}</span>{" "}
                within one business day to confirm a time. Nothing else is needed from you now.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-2 text-left">
              <ContactOption
                icon={<Mail className="h-4 w-4" aria-hidden />}
                href={`mailto:${ADVISOR_EMAIL}?subject=${encodeURIComponent("Advisor session — " + focus)}`}
                label={`Email us directly · ${ADVISOR_EMAIL}`}
              />
              <ContactOption
                icon={<CalendarClock className="h-4 w-4" aria-hidden />}
                href="/contact"
                label="Send more detail via the contact page"
                internal
              />
            </div>
            <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>Talk to our advisor</DialogTitle>
              <DialogDescription>
                Five fields, then we route you to the right AIgilityX advisor and propose a time.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="advisor-name">Full name</Label>
                <Input
                  id="advisor-name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={!!errors.fullName}
                  required
                />
                {errors.fullName ? (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="advisor-email">Work email</Label>
                <Input
                  id="advisor-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  required
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="advisor-org">Organization</Label>
                <Input
                  id="advisor-org"
                  autoComplete="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  aria-invalid={!!errors.organization}
                  required
                />
                {errors.organization ? (
                  <p className="text-xs text-destructive">{errors.organization}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="advisor-focus">What do you need?</Label>
                  <Select
                    value={focus}
                    onValueChange={(v) => setFocus(v as (typeof FOCUS_OPTIONS)[number])}
                  >
                    <SelectTrigger id="advisor-focus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOCUS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="advisor-timing">Preferred timing</Label>
                  <Select
                    value={timing}
                    onValueChange={(v) => setTiming(v as (typeof TIMING_OPTIONS)[number])}
                  >
                    <SelectTrigger id="advisor-timing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMING_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="advisor-message">Context (optional)</Label>
                <Textarea
                  id="advisor-message"
                  rows={3}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Sector, mandate, or the decision you are trying to make."
                />
              </div>
            </div>

            {serverError ? (
              <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {serverError}
              </p>
            ) : null}

            <Button type="submit" className="mt-6 w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Request an advisor session"}
            </Button>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Prefer another channel?
              </p>
              <ContactOption
                icon={<Mail className="h-4 w-4" aria-hidden />}
                href={`mailto:${ADVISOR_EMAIL}?subject=${encodeURIComponent("Advisor session request")}`}
                label={`Email ${ADVISOR_EMAIL}`}
              />
              <ContactOption
                icon={<MessageSquare className="h-4 w-4" aria-hidden />}
                href="/contact"
                label="Use the full contact & demo form"
                internal
              />
              <ContactOption
                icon={<CalendarClock className="h-4 w-4" aria-hidden />}
                href="/advisory"
                label="See workshops & advisory formats"
                internal
              />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContactOption({
  icon,
  href,
  label,
  internal = false,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
  internal?: boolean;
}) {
  return (
    <a
      href={href}
      {...(internal ? {} : { rel: "noreferrer" })}
      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </a>
  );
}
