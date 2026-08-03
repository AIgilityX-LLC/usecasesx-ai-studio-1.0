import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { SiteShell } from "@/components/SiteShell";
import { PageHero } from "@/components/usecasex/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSharedPortfolio } from "@/lib/portfolio-share.functions";
import {
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  type FundingState,
  type PortfolioItemDecision,
} from "@/lib/portfolio-model";

export const Route = createFileRoute("/p/$token")({
  loader: async ({ params }) => {
    const portfolio = await getSharedPortfolio({ data: { token: params.token } });
    if (!portfolio) throw notFound();
    return portfolio;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Shared portfolio"} — UseCasesX™` },
      {
        name: "description",
        content:
          loaderData?.objective ??
          "A view-only AI opportunity portfolio shared from UseCasesX™: decisions, target periods and funding state.",
      },
      { property: "og:title", content: `${loaderData?.name ?? "Shared portfolio"} — UseCasesX™` },
      {
        property: "og:description",
        content: loaderData?.objective ?? "A view-only AI opportunity portfolio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedPortfolioPage,
  errorComponent: ({ error }) => (
    <SiteShell>
      <div
        className="mx-auto max-w-2xl px-6 py-20 text-center text-sm text-muted-foreground"
        role="alert"
      >
        {error.message}
      </div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Share link unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This portfolio link has been revoked, has expired, or is invalid.
        </p>
        <Link
          to="/repository"
          className="mt-4 inline-block font-semibold text-primary hover:underline"
        >
          Browse the repository →
        </Link>
      </div>
    </SiteShell>
  ),
});

function SharedPortfolioPage() {
  const portfolio = Route.useLoaderData();

  return (
    <SiteShell>
      <PageHero
        tone="dark"
        eyebrow="Shared portfolio · view only"
        title={portfolio.name}
        description={portfolio.objective ?? "An AI opportunity portfolio shared for review."}
      />
      <section className="bg-background">
        <div className="mx-auto max-w-[1000px] space-y-4 px-6 py-12">
          <p className="text-sm text-muted-foreground">
            This is a read-only snapshot of portfolio decisions. Nothing here can be edited, and the
            underlying use cases and scores are unchanged.
          </p>

          {portfolio.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">This portfolio has no use cases yet.</p>
          ) : (
            <ol className="space-y-3">
              {portfolio.entries.map((entry, index) => (
                <li key={`${entry.useCaseSlug ?? "entry"}-${index}`}>
                  <Card>
                    <CardContent className="py-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold text-foreground">
                          {entry.rank != null && (
                            <span className="mr-2 text-muted-foreground">#{entry.rank}</span>
                          )}
                          {entry.useCaseTitle ?? "Use case"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {PORTFOLIO_ITEM_DECISION_LABELS[
                              entry.decision as PortfolioItemDecision
                            ] ?? entry.decision}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {FUNDING_STATE_LABELS[entry.fundingState as FundingState] ??
                              entry.fundingState}
                          </Badge>
                        </div>
                      </div>
                      <dl className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>
                          <dt className="inline font-medium">Target period: </dt>
                          <dd className="inline">{entry.targetPeriod || "Not set"}</dd>
                        </div>
                        <div>
                          <dt className="inline font-medium">Next action: </dt>
                          <dd className="inline">{entry.nextAction || "Not set"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
