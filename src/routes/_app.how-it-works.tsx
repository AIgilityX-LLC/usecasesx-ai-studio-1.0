import { createFileRoute } from "@tanstack/react-router";
import {
  Compass,
  PenTool,
  Gauge,
  ListOrdered,
  Layers,
  CalendarRange,
  FileDown,
  Users,
} from "lucide-react";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";

const STEPS = [
  {
    icon: Compass,
    stage: "Discover",
    title: "Find opportunities that are already proven elsewhere",
    body: "Search the public repository by industry, business function, AI capability, value potential, complexity and risk. Every published record carries a provenance label and quality status you can filter on.",
    edition: "Lite",
  },
  {
    icon: PenTool,
    stage: "Capture & Design",
    title: "Turn a signal into a defined use case",
    body: "Capture the pain point, desired outcome and owner as an opportunity, then design it in AI Use Case Studio™ — problem statement, AI type, data needs and delivery shape. Drafts autosave to your workspace.",
    edition: "Pro",
  },
  {
    icon: Gauge,
    stage: "Score",
    title: "Assess feasibility, data readiness and value",
    body: "Run per-use-case feasibility and data-readiness assessments and record value, risk, strategic fit and time-to-value. Results are stored against the use case, not thrown away.",
    edition: "Pro",
  },
  {
    icon: ListOrdered,
    stage: "Prioritize",
    title: "Rank on evidence instead of opinion",
    body: "Compare scored use cases side by side and agree decisions — approved, deferred or declined — with the reasoning attached.",
    edition: "Pro",
  },
  {
    icon: Layers,
    stage: "Portfolio",
    title: "Hold the investable set in one place",
    body: "PortfolioX™ carries rank, decision, funding state, delivery stage and owner for each item, so the portfolio survives the meeting it was created in.",
    edition: "Pro",
  },
  {
    icon: CalendarRange,
    stage: "Roadmap",
    title: "Sequence delivery and track benefits",
    body: "Place items into target periods with milestones and owners, and track baseline, target and expected benefit values per use case with an evidence source.",
    edition: "Pro",
  },
  {
    icon: FileDown,
    stage: "Export",
    title: "Produce the pack the board actually reads",
    body: "Select the deliverables you need and generate one consistent PDF package, with version history per deliverable and an export receipt in the audit trail.",
    edition: "Pro",
  },
  {
    icon: Users,
    stage: "Advisory",
    title: "Bring facilitators and the wider suite in",
    body: "Run discovery and value-design workshops with invited participants, and raise structured handoffs to the wider SovereignX AI Suite for readiness, governance and advisory work.",
    edition: "Pro / Enterprise",
  },
];

export const Route = createFileRoute("/_app/how-it-works")({
  head: () =>
    publicHead({
      path: "/how-it-works",
      title: "How UseCasesX Works — Discover to Portfolio in 8 Steps",
      description:
        "Discover, capture, design, score, prioritize, portfolio, roadmap and export. See exactly how UseCasesX takes an AI idea to a funded, governed portfolio item.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "How it works", path: "/how-it-works" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Take an AI idea to a funded portfolio item",
          step: STEPS.map((step) => ({
            "@type": "HowToStep",
            name: `${step.stage}: ${step.title}`,
            text: step.body,
          })),
        },
      ],
    }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="From an AI idea to a funded, governed portfolio item."
        intro="UseCasesX runs one continuous journey: Discover, Capture, Design, Score, Prioritize, Portfolio, Roadmap, Export, Advisory. Each step leaves evidence behind, so the next decision is grounded in the last one."
      >
        <TrackedCta to="/repository" label="Start at Discover" location="how-hero-repository" />
        <TrackedCta
          to="/editions"
          label="Compare editions"
          location="how-hero-editions"
          variant="secondary"
        />
      </PageHero>

      <Section
        title="The eight steps"
        lead="Steps marked Lite are open to everyone. Steps marked Pro need a Founding Access workspace."
      >
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li
              key={step.stage}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row"
            >
              <div className="flex shrink-0 items-start gap-4">
                <span className="font-mono text-2xl font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <step.icon className="mt-1 h-6 w-6 text-primary" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {step.stage} — {step.title}
                  </h3>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {step.edition}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Where to go next" tone="muted">
        <div className="flex flex-wrap gap-3">
          <TrackedCta to="/repository" label="Browse use cases" location="how-footer-repository" />
          <TrackedCta
            to="/advisory"
            label="Workshops & advisory"
            location="how-footer-advisory"
            variant="secondary"
          />
          <TrackedCta
            to="/contact"
            label="Request a demo"
            location="how-footer-contact"
            variant="secondary"
          />
        </div>
      </Section>
    </>
  );
}
