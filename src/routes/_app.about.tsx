import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { breadcrumbJsonLd, publicHead, SITE_NAME } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
import { TRUST_FACTS, LAUNCH_DATE, FOUNDING_ACCESS_END } from "@/lib/founding-access";

export const Route = createFileRoute("/_app/about")({
  head: () =>
    publicHead({
      path: "/about",
      title: "About & Trust — UseCasesX by AIgilityX",
      description:
        "What UseCasesX is, who builds it, and how the platform handles provenance, workspace isolation, audit trails and demonstration data. Factual statements only.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About & trust", path: "/about" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          description:
            "UseCasesX is a global AI use case repository, AI Opportunity Map and AI Use Case Studio, part of the SovereignX AI Suite.",
        },
      ],
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About & trust"
        title="Built so an AI portfolio can survive scrutiny."
        intro="UseCasesX™ is the global AI use case repository, AI Opportunity Map and AI Use Case Studio™ within the SovereignX AI Suite. It exists because most organisations can list AI ideas but cannot show how they were assessed, why they were funded, or what benefit they were expected to deliver."
      >
        <TrackedCta to="/how-it-works" label="How it works" location="about-hero-how" />
        <TrackedCta
          to="/contact"
          label="Contact us"
          location="about-hero-contact"
          variant="secondary"
        />
      </PageHero>

      <Section
        title="What we claim, and what we don't"
        lead="This page contains only statements we can evidence in the product. We do not publish client names, logos, certifications, adoption numbers or testimonials, because we are pre-launch and have none to report."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {TRUST_FACTS.map((fact) => (
            <article key={fact.title} className="rounded-2xl border border-border bg-card p-6">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="mt-3 text-base font-bold text-foreground">{fact.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{fact.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Where the product is today" tone="muted">
        <div className="max-w-3xl space-y-4 text-muted-foreground">
          <p>
            Lite and Pro Founding Access are targeted for release on {LAUNCH_DATE}. Pro Founding
            Access is complimentary through {FOUNDING_ACCESS_END}, subject to published fair-use
            limits. Enterprise capability runs on the same codebase and is initially delivered
            through paid design partner engagements.
          </p>
          <p>
            Some Enterprise capabilities are designed into the architecture but are not live yet.
            Those are listed explicitly on the Editions and Enterprise pages rather than implied.
          </p>
          <p>
            Demonstration scenarios shown in the product are illustrative constructions, not real
            client case studies, and are labelled as such wherever they appear.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <TrackedCta to="/editions" label="See editions" location="about-footer-editions" />
          <TrackedCta
            to="/repository"
            label="Browse the repository"
            location="about-footer-repository"
            variant="secondary"
          />
        </div>
      </Section>
    </>
  );
}
