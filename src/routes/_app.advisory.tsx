import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";

const AGENDA = [
  {
    phase: "Before the session",
    items: [
      "Agree scope: which business units, functions or mission areas are in play",
      "Pre-load candidate use cases from the repository for the relevant sectors",
      "Invite participants into a facilitated workshop in their own workspace",
    ],
  },
  {
    phase: "Discovery",
    items: [
      "Capture opportunities as pain point, desired outcome, function and urgency",
      "Cluster duplicates and name an owner for each surviving opportunity",
      "Park anything that is a policy or process problem rather than an AI problem",
    ],
  },
  {
    phase: "Value design",
    items: [
      "Shape the strongest opportunities into defined use cases",
      "Score value, feasibility, data readiness, risk, strategic fit and time to value",
      "Agree the benefit each one is expected to move, with a baseline and a target",
    ],
  },
  {
    phase: "Decision",
    items: [
      "Vote and rank inside the workshop board",
      "Record approve / defer / decline with the reasoning attached",
      "Promote the approved set into a portfolio and a sequenced roadmap",
    ],
  },
  {
    phase: "After the session",
    items: [
      "Export one consistent deliverables package for the sponsor",
      "Keep the workshop outcome, votes and audit trail in the workspace",
      "Raise structured handoffs for readiness, governance or advisory follow-up",
    ],
  },
];

export const Route = createFileRoute("/_app/advisory")({
  head: () =>
    publicHead({
      path: "/advisory",
      title: "AI Use Case Workshops & Advisory — UseCasesX",
      description:
        "Run a facilitated AI discovery and value design workshop inside UseCasesX: capture opportunities, score and vote live, and leave with a scored portfolio.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Workshops & advisory", path: "/advisory" },
        ]),
      ],
    }),
  component: AdvisoryPage,
});

function AdvisoryPage() {
  return (
    <>
      <PageHero
        eyebrow="Workshops & advisory"
        title="Run the discovery workshop inside the tool, not on sticky notes."
        intro="The AI Use Case Discovery and Value Design Workshop is digitised end to end: invite participants, capture opportunities live, score and vote in the room, and leave with a scored portfolio, a roadmap and an export pack — not a photo of a whiteboard."
      >
        <TrackedCta to="/contact" label="Request a workshop" location="advisory-hero-contact" />
        <TrackedCta
          to="/how-it-works"
          label="See the full journey"
          location="advisory-hero-how"
          variant="secondary"
        />
      </PageHero>

      <Section
        title="How a session runs"
        lead="A workshop is a workspace object: participants, items, votes and outcomes are all recorded and stay available afterwards."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {AGENDA.map((block) => (
            <article key={block.phase} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-bold text-foreground">{block.phase}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Facilitated by you, or with us"
        lead="Workshop mode is part of Pro Founding Access, so your own facilitators can run sessions at no cost during the Founding Access period. Advisory-led engagements — where AIgilityX facilitates, brings sector priors and writes the recommendation — are delivered as a paid engagement alongside the Enterprise Design Partner programme."
        tone="muted"
      >
        <div className="flex flex-wrap gap-3">
          <TrackedCta
            to="/enterprise"
            label="Enterprise Design Partner"
            location="advisory-footer-enterprise"
          />
          <TrackedCta
            to="/contact"
            label="Talk to us"
            location="advisory-footer-contact"
            variant="secondary"
          />
        </div>
      </Section>
    </>
  );
}
