import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
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
import { track, trackCTAEvent } from "@/lib/usecasex.tracking";
import { saveLeadCapture } from "@/lib/leadCapture";

const INTERESTS = [
  { value: "pro", label: "Pro Founding Access" },
  { value: "demo", label: "Guided product demo" },
  { value: "workshop", label: "Discovery / value design workshop" },
  { value: "enterprise", label: "Enterprise Design Partner programme" },
  { value: "other", label: "Something else" },
] as const;

export const Route = createFileRoute("/_app/contact")({
  head: () =>
    publicHead({
      path: "/contact",
      title: "Contact & Request a Demo — UseCasesX",
      description:
        "Ask about Pro Founding Access, book a guided demo, request a discovery workshop, or apply to the Enterprise Design Partner programme.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]),
      ],
    }),
  component: ContactPage,
});

function ContactPage() {
  const [interest, setInterest] = useState<string>("demo");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      // Persist the enquiry itself so the team can action it, then record
      // conversion telemetry (which deliberately carries no message content).
      await saveLeadCapture({
        fullName: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        organization: (String(form.get("organization") ?? "").trim() || null) as string | null,
        interestArea: interest,
        message: (String(form.get("message") ?? "").trim() || null) as string | null,
        consent: true,
        triggerCase: "contact_form",
        sourcePage: "/contact",
      });

      track("contact_form_submitted", {
        interest,
        has_organization: Boolean(form.get("organization")),
      });

      setSubmitted(true);
      toast.success("Thanks — your enquiry has been recorded. We'll be in touch by email.");
    } catch (error) {
      console.error("[contact] enquiry submission failed", error);
      toast.error("We couldn't send your enquiry. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to us about your AI portfolio."
        intro="Tell us what you are trying to decide and we will show you the part of the product that answers it. No sales sequence, no gated content."
      >
        <TrackedCta
          to="/repository"
          label="Or just browse the repository"
          location="contact-hero-repository"
          variant="secondary"
        />
      </PageHero>

      <Section title="Send an enquiry">
        {submitted ? (
          <div className="max-w-2xl rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h3 className="text-base font-bold text-foreground">Enquiry received</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks for getting in touch. We reply to enquiries by email, usually within two
              working days. In the meantime, the repository is open — no account needed.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <TrackedCta
                to="/repository"
                label="Browse use cases"
                location="contact-success-repository"
              />
              <TrackedCta
                to="/how-it-works"
                label="See how it works"
                location="contact-success-how"
                variant="secondary"
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Your name</Label>
                <Input id="contact-name" name="name" required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Work email</Label>
                <Input id="contact-email" name="email" type="email" required autoComplete="email" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-organization">Organisation</Label>
                <Input id="contact-organization" name="organization" autoComplete="organization" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-interest">What are you interested in?</Label>
                <Select value={interest} onValueChange={setInterest}>
                  <SelectTrigger id="contact-interest">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERESTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">What are you trying to decide?</Label>
              <Textarea id="contact-message" name="message" rows={5} required />
            </div>

            <p className="text-xs text-muted-foreground">
              We use your details only to respond to this enquiry.
            </p>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              data-analytics-id="cta-contact-submit"
              onClick={() => trackCTAEvent("cta_clicked", { location: "contact-submit", interest })}
            >
              {submitting ? "Sending…" : "Send enquiry"}
            </Button>
          </form>
        )}
      </Section>
    </>
  );
}
