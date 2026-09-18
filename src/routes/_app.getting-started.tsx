import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
import { TransparencyLinks } from "@/components/legal/LegalDocumentView";
import { GETTING_STARTED_STEPS } from "@/lib/legal/help-content";
import { FOUNDING_ACCESS_END } from "@/lib/founding-access";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/getting-started")({
  head: () =>
    publicHead({
      path: "/getting-started",
      title: "Getting Started — UseCasesX",
      description:
        "A guided path through UseCasesX: discover credible AI use cases, capture an opportunity, design and score it, prioritise a portfolio, sequence a roadmap and export the evidence.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Getting Started", path: "/getting-started" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Getting Started With UseCasesX™",
          step: GETTING_STARTED_STEPS.map((step) => ({
            "@type": "HowToStep",
            position: step.step,
            name: step.title,
            text: step.body,
          })),
        },
      ],
    }),
  component: GettingStartedPage,
});

function GettingStartedPage() {
  return (
    <>
      <PageHero
        eyebrow="Getting Started"
        title="From a browse to a defensible AI portfolio in eight steps."
        intro="Steps 1 and 8 are open to anyone. The rest need a Pro Founding Access workspace, which is complimentary through 31 December 2026 subject to published fair-use limits."
      >
        <TrackedCta to="/repository" label="Start With Step 1" location="getting-started-hero" />
        <TrackedCta
          to="/faq"
          label="Read the FAQs"
          location="getting-started-hero-faq"
          variant="secondary"
        />
      </PageHero>

      <Section
        title="The Journey"
        lead="Each step happens on a real surface in the product. Nothing here is a mock-up."
      >
        <ol className="space-y-4">
          {GETTING_STARTED_STEPS.map((step) => (
            <li key={step.step} className="rounded-lg border border-border p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/40"
                  aria-hidden="true"
                >
                  {step.step}
                </span>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                {step.requiresAccount ? (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" aria-hidden="true" /> Account needed
                  </Badge>
                ) : (
                  <Badge variant="outline">No account needed</Badge>
                )}
              </div>
              <p className="mt-3 max-w-3xl text-muted-foreground">{step.body}</p>
              <Link
                to={step.to as never}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {step.ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Before You Invite Your Team"
        lead="Three things worth knowing early, so nobody is surprised later."
        tone="muted"
      >
        <ul className="grid gap-4 sm:grid-cols-3">
          <li className="rounded-lg border border-border bg-background p-5">
            <h3 className="font-semibold text-foreground">AI is decision support</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every AI draft needs human validation before it funds or approves anything. The{" "}
              <Link to="/ai-notice" className="text-primary underline-offset-4 hover:underline">
                AI notice
              </Link>{" "}
              states exactly what is sent and what is never used for training.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-background p-5">
            <h3 className="font-semibold text-foreground">Private by default</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your workspace is isolated in the database. Content leaves it only when you publish,
              share, invite or approve a handoff — see the{" "}
              <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                privacy notice
              </Link>
              .
            </p>
          </li>
          <li className="rounded-lg border border-border bg-background p-5">
            <h3 className="font-semibold text-foreground">Complimentary, with limits</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pro Founding Access is free through {FOUNDING_ACCESS_END}. Only AI assistance is
              metered —{" "}
              <Link
                to="/founding-access-terms"
                className="text-primary underline-offset-4 hover:underline"
              >
                see the terms
              </Link>
              .
            </p>
          </li>
        </ul>
      </Section>

      <Section title="Related Pages">
        <TransparencyLinks currentPath="/getting-started" />
      </Section>
    </>
  );
}
