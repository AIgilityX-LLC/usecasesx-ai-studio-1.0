import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
import { EDITIONS, LAUNCH_DATE } from "@/lib/founding-access";

const enterprise = EDITIONS.find((e) => e.key === "enterprise")!;

const FIT = [
  "You have AI activity in more than one business unit and no single view of it.",
  "You need scoring, decisions and benefits recorded in a way audit and finance accept.",
  "You want the same method applied across entities, not a different spreadsheet per team.",
  "You are prepared to work with us on the product, not just consume it.",
];

const COMMITMENTS = [
  {
    title: "What you get",
    items: [
      "A paid engagement with a named scope, timeline and outcome",
      "Facilitated discovery and value design workshops for your teams",
      "Your own workspaces with row-level tenant isolation and audit events",
      "Direct influence over the Enterprise roadmap and priority on the capabilities you need",
    ],
  },
  {
    title: "What we ask",
    items: [
      "An executive sponsor and a working team who can make decisions",
      "Access to enough context to design real use cases, not hypotheticals",
      "Structured feedback on the capabilities you exercise",
      "Agreement on what may be referenced publicly — nothing is published without your written consent",
    ],
  },
];

export const Route = createFileRoute("/_app/enterprise")({
  head: () =>
    publicHead({
      path: "/enterprise",
      title: "Enterprise Design Partner Programme — UseCasesX",
      description:
        "A paid engagement for organisations standardising AI portfolio governance across entities. See what is live today, what is designed, and how to apply.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Enterprise", path: "/enterprise" },
        ]),
      ],
    }),
  component: EnterprisePage,
});

function EnterprisePage() {
  return (
    <>
      <PageHero
        eyebrow="Enterprise Design Partner"
        title="Build the enterprise edition with us, on real portfolios."
        intro={`Enterprise capability is designed into the architecture from day one and is initially delivered through a paid Enterprise Design Partner engagement rather than self-serve sign-up. Founding Access opens with the ${LAUNCH_DATE} release; design partnerships are agreed individually.`}
      >
        <TrackedCta
          to="/contact"
          label="Apply as a design partner"
          location="enterprise-hero-contact"
        />
        <TrackedCta
          to="/editions"
          label="Compare editions"
          location="enterprise-hero-editions"
          variant="secondary"
        />
      </PageHero>

      <Section title="Who this is for">
        <ul className="grid gap-3 sm:grid-cols-2">
          {FIT.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-border bg-card p-4 text-sm text-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="The engagement" tone="muted">
        <div className="grid gap-4 md:grid-cols-2">
          {COMMITMENTS.map((block) => (
            <article key={block.title} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-bold text-foreground">{block.title}</h3>
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
        title="Live today versus designed"
        lead="We keep this explicit. Anything in the right-hand list is part of the architecture and roadmap, but it is not running in the product today and is not sold as if it were."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
              Live today
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-foreground">
              {enterprise.includes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Designed, not yet live
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(enterprise.notLive ?? []).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8">
          <TrackedCta
            to="/contact"
            label="Start the conversation"
            location="enterprise-footer-contact"
          />
        </div>
      </Section>
    </>
  );
}
