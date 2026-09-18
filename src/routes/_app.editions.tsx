import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import {
  EditionMatrix,
  FoundingAccessTerms,
  PageHero,
  Section,
  TrackedCta,
} from "@/components/marketing/MarketingPrimitives";
import { FOUNDING_ACCESS_END, LAUNCH_DATE } from "@/lib/founding-access";

export const Route = createFileRoute("/_app/editions")({
  head: () =>
    publicHead({
      path: "/editions",
      title: "Editions — Lite, Pro Founding Access, Enterprise",
      description:
        "Compare UseCasesX editions: free Lite discovery, complimentary Pro Founding Access through 31 December 2026, and the Enterprise Design Partner engagement.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Editions", path: "/editions" },
        ]),
      ],
    }),
  component: EditionsPage,
});

function EditionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Editions"
        title="One platform. Three ways to use it."
        intro="Lite is for discovery and is free. Pro Founding Access adds design, scoring, portfolio and export, and is complimentary through 31 December 2026 subject to fair use. Enterprise is a paid Design Partner engagement for organisations standardising AI portfolio governance."
      >
        <TrackedCta to="/repository" label="Start With Lite" location="editions-hero-lite" />
        <TrackedCta
          to="/pricing"
          label="Join Pro Founding Access"
          location="editions-hero-pro"
          variant="secondary"
        />
      </PageHero>

      <Section
        title="What Each Edition Includes"
        lead="Capabilities listed here are live today. Anything designed but not yet available is shown separately so nothing implies more than the product does."
      >
        <EditionMatrix ctaLocation="editions-matrix" />
      </Section>

      <Section
        title="Founding Access terms and fair use"
        lead={`Pro Founding Access opens with the ${LAUNCH_DATE} release and runs complimentary through ${FOUNDING_ACCESS_END}.`}
        tone="muted"
      >
        <FoundingAccessTerms />
      </Section>

      <Section title="Not Sure Which Fits?">
        <p className="max-w-3xl text-muted-foreground">
          If you are exploring what AI could do in your sector, start with Lite — no account is
          needed. If you need to turn that into a scored, funded portfolio, take Pro Founding
          Access. If you need this across several entities with advisory support, talk to us about a
          design partnership.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <TrackedCta to="/how-it-works" label="See How It Works" location="editions-footer-how" />
          <TrackedCta
            to="/contact"
            label="Request A Demo"
            location="editions-footer-contact"
            variant="secondary"
          />
        </div>
      </Section>
    </>
  );
}
