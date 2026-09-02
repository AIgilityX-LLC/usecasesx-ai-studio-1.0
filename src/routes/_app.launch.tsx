import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbJsonLd, publicHead } from "@/lib/seo";
import { PageHero, Section, TrackedCta } from "@/components/marketing/MarketingPrimitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FOUNDING_ACCESS_END, LAUNCH_DATE } from "@/lib/founding-access";
import { getLaunchPageContext } from "@/lib/launch.functions";

function highlights(stats: { useCases: number; industries: number }, statsAvailable: boolean) {
  const corpus =
    statsAvailable && stats.useCases > 0
      ? `${stats.useCases} published AI use cases across ${stats.industries} industries`
      : "A curated library of published AI use cases across many industries";
  return [
    {
      title: "A repository you can act on",
      body: `${corpus}, each with value, complexity and risk signals — browsable without an account.`,
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

const FEATURES = [
  {
    name: "Global AI Use Case Repository",
    body: "Search and filter published use cases by industry, business function, AI capability, value theme, complexity and risk. No account needed.",
  },
  {
    name: "AI Opportunity Map",
    body: "Place candidate opportunities against value and feasibility so the sequencing argument is visible rather than asserted.",
  },
  {
    name: "AI Use Case Studio™",
    body: "Turn an opportunity into a designed use case: problem, data readiness, capability fit, benefits, metrics and deliverables.",
  },
  {
    name: "Scoring and portfolios",
    body: "Score feasibility and value with a consistent scorecard, then group scored use cases into portfolios and a sequenced roadmap.",
  },
  {
    name: "Exports and reporting",
    body: "Export scored portfolios, roadmaps and deliverables as documents you can take into an investment or governance review.",
  },
  {
    name: "Workspaces, roles and audit",
    body: "Workspace ownership, role-based access and append-only audit events on governance-relevant actions from day one.",
  },
];

const JOIN_STEPS = [
  {
    step: "1",
    title: "Browse Lite — no account",
    body: "Open the repository and confirm the depth of the corpus for your sector before you commit anything.",
    cta: { to: "/repository", label: "Open the repository", location: "launch-join-1" },
  },
  {
    step: "2",
    title: "Create your Pro Founding Access account",
    body: `Sign up with a work email. Founding Access is complimentary through ${FOUNDING_ACCESS_END}, subject to published fair-use limits.`,
    cta: { to: "/auth", label: "Create an account", location: "launch-join-2" },
  },
  {
    step: "3",
    title: "Run your first use case end to end",
    body: "Capture an opportunity, design it in the Studio, score it and export the portfolio view — the full journey in one sitting.",
    cta: { to: "/how-it-works", label: "See how it works", location: "launch-join-3" },
  },
];


export const Route = createFileRoute("/_app/launch")({
  loader: async () => getLaunchPageContext(),
  head: ({ loaderData }) => {
    const live = loaderData?.live ?? false;
    return publicHead({
      path: "/launch",
      title: live
        ? "UseCasesX™ launch — Lite and Pro Founding Access"
        : "UseCasesX™ release candidate — editions preview",
      description: live
        ? "The UseCasesX™ launch announcement: free Lite discovery, complimentary Pro Founding Access through 31 December 2026, and how to get started today."
        : "Preview of the UseCasesX™ release candidate: Lite discovery and Pro Founding Access. Not the announced release; availability is subject to change.",
      ogType: "article",
      noindex: !live,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Launch", path: "/launch" },
        ]),
        ...(live
          ? [
              {
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                headline: "UseCasesX™ launches Lite and Pro Founding Access",
                description:
                  "AIgilityX announces the launch of UseCasesX™ — the Global AI Use Case Repository, AI Opportunity Map and AI Use Case Studio™.",
                publisher: { "@type": "Organization", name: "AIgilityX™" },
              },
            ]
          : []),
      ],
    });
  },
  errorComponent: LaunchUnavailable,
  component: LaunchAnnouncementPage,
});

function LaunchUnavailable() {
  return (
    <PageHero
      eyebrow="Release candidate"
      title="UseCasesX™ — Lite and Pro Founding Access"
      intro="We could not load the live catalogue figures just now. The repository itself is unaffected — open it directly below."
    >
      <TrackedCta to="/repository" label="Open the repository" location="launch-error-repository" />
      <TrackedCta
        to="/editions"
        label="Compare editions"
        location="launch-error-editions"
        variant="secondary"
      />
    </PageHero>
  );
}

function LaunchAnnouncementPage() {
  const { stats, statsAvailable, live } = Route.useLoaderData();
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
          {highlights(stats, statsAvailable).map((item) => (
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

      <Section
        title="What ships in this release"
        lead={`Six capability areas make up the ${LAUNCH_DATE} release of Lite and Pro Founding Access.`}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.name}>
              <CardHeader>
                <CardTitle className="text-lg">{feature.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.body}</CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="How to join"
        lead={
          live
            ? `Available now. Pro Founding Access stays complimentary through ${FOUNDING_ACCESS_END}.`
            : `Launch date: ${LAUNCH_DATE}. These are the steps you will follow once the release is announced.`
        }
        tone="muted"
      >
        <ol className="grid gap-4 md:grid-cols-3">
          {JOIN_STEPS.map((item) => (
            <li key={item.step}>
              <Card className="h-full">
                <CardHeader className="space-y-2">
                  <Badge variant="secondary" className="w-fit">
                    Step {item.step}
                  </Badge>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>{item.body}</p>
                  <TrackedCta
                    to={item.cta.to}
                    label={item.cta.label}
                    location={item.cta.location}
                    variant="secondary"
                  />
                </CardContent>
              </Card>
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
