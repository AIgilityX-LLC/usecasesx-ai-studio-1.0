import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead, SITE_URL } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FOUNDING_ACCESS_END, LAUNCH_DATE } from "@/lib/founding-access";
import { getCatalogStats } from "@/lib/public-catalog.functions";

function highlights(stats: { useCases: number; industries: number }) {
  return [
    {
      title: "A repository you can act on",
      body: `${stats.useCases} published AI use cases across ${stats.industries} industries, each with value, complexity and risk signals — browsable without an account.`,
      edition: "Lite",
    },
    {
      title: "From opportunity to portfolio",
      body: "Capture an opportunity, design it in the AI Use Case Studio™, score feasibility and value, then prioritise it into a portfolio and roadmap.",
      edition: "Pro Founding Access",
    },
    {
      title: "Evidence you can hand over",
      body: "Export scored portfolios, roadmaps and deliverables so an investment or governance conversation starts from a document, not a slide.",
      edition: "Pro Founding Access",
    },
    {
      title: "Built tenant-aware from day one",
      body: "Workspace ownership, role-based access and audit trails are in the data model now, so an Enterprise Design Partner engagement extends the same platform.",
      edition: "Enterprise",
    },
  ];
}

const JOURNEY = [
  "Discover",
  "Capture Opportunity",
  "Design",
  "Score",
  "Prioritize",
  "Portfolio",
  "Roadmap",
  "Export",
  "Advisory",
];

export const Route = createFileRoute("/_app/launch")({
  head: () =>
    publicHead({
      path: "/launch",
      title: "UseCasesX™ launch — Lite and Pro Founding Access",
      description:
        "The UseCasesX™ launch announcement: free Lite discovery, complimentary Pro Founding Access through 31 December 2026, and how to get started today.",
      ogType: "article",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Launch", path: "/launch" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: "UseCasesX™ launches Lite and Pro Founding Access",
          description:
            "AIgilityX announces the launch of UseCasesX™ — the Global AI Use Case Repository, AI Opportunity Map and AI Use Case Studio™.",
          publisher: { "@type": "Organization", name: "AIgilityX™" },
        },
      ],
    }),
  loader: async () => ({ stats: await getCatalogStats() }),
  component: LaunchAnnouncementPage,
});

/** True only once the page is served from the canonical published host. */
function useIsLiveHost() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    try {
      setLive(window.location.host === new URL(SITE_URL).host);
    } catch {
      setLive(false);
    }
  }, []);
  return live;
}

function LaunchAnnouncementPage() {
  const { stats } = Route.useLoaderData();
  const live = useIsLiveHost();
  return (
    <>
      <PageHero
        eyebrow={live ? `Announcement · ${LAUNCH_DATE}` : "Release candidate · not yet announced"}
        title={
          live
            ? "UseCasesX™ is here — Lite and Pro Founding Access"
            : "UseCasesX™ release candidate — Lite and Pro Founding Access"
        }
        intro={`AIgilityX™ is ${live ? "opening" : "preparing to open"} UseCasesX™: a Global AI Use Case Repository, an AI Opportunity Map and the AI Use Case Studio™ in one platform. Lite is free and needs no account. Pro Founding Access is complimentary through ${FOUNDING_ACCESS_END}, subject to fair-use limits.${live ? "" : " This preview build is not the announced release; figures and availability are subject to change."}`}
      >
        <TrackedCta to="/repository" label="Explore the repository" location="launch-hero-lite" />
        <TrackedCta
          to="/pricing"
          label="Join Pro Founding Access"
          location="launch-hero-pro"
          variant="secondary"
        />
      </PageHero>

      <Section
        title={live ? "What is live today" : "What the candidate build includes"}
        lead="Everything listed here works in the product now. Capabilities that are designed but not yet available are called out on the editions page rather than implied here."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {highlights(stats).map((item) => (
            <Card key={item.title}>
              <CardHeader className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  {item.edition}
                </Badge>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="The journey the platform supports"
        lead="One continuous path from a question to a funded, governed plan."
        tone="muted"
      >
        <ol className="flex flex-wrap gap-2" aria-label="Core journey stages">
          {JOURNEY.map((stage, index) => (
            <li key={stage} className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium">
                {index + 1}. {stage}
              </span>
              {index < JOURNEY.length - 1 ? (
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Who it is for" lead="Same codebase, different depth of use.">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Researching AI options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Start in Lite. Browse, filter and compare use cases with no sign-up.</p>
              <TrackedCta to="/discover" label="Start discovering" location="launch-who-lite" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Building an AI portfolio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Take Pro Founding Access and move from opportunity to scored portfolio and roadmap.
              </p>
              <TrackedCta
                to="/how-it-works"
                label="See how it works"
                location="launch-who-pro"
                variant="secondary"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Standardising across entities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Enterprise is delivered as a paid Design Partner engagement with advisory support.
              </p>
              <TrackedCta
                to="/enterprise"
                label="Talk about a design partnership"
                location="launch-who-enterprise"
                variant="secondary"
              />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Get started" tone="muted">
        <p className="max-w-3xl text-muted-foreground">
          Lite is open now. Pro Founding Access is complimentary through {FOUNDING_ACCESS_END} and
          subject to fair-use limits published on the editions page.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <TrackedCta to="/repository" label="Open the repository" location="launch-footer-lite" />
          <TrackedCta
            to="/editions"
            label="Compare editions"
            location="launch-footer-editions"
            variant="secondary"
          />
          <TrackedCta
            to="/contact"
            label="Talk to an advisor"
            location="launch-footer-contact"
            variant="secondary"
          />
        </div>
      </Section>
    </>
  );
}
