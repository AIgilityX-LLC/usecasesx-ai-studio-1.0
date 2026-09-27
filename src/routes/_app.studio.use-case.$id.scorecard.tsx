import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { UseCaseScorecard } from "@/components/scoring/UseCaseScorecard";

export const Route = createFileRoute("/_app/studio/use-case/$id/scorecard")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Scorecard — AI Use Case Studio™" },
      {
        name: "description",
        content:
          "Score a use case across value, strategic alignment, feasibility, data readiness, time to value, organisational readiness and risk, with every weight and contribution explained.",
      },
      { property: "og:title", content: "Scorecard — AI Use Case Studio™" },
      {
        property: "og:description",
        content:
          "Explainable, configurable prioritisation scoring with versioned, attributable results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScorecardPage,
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-4 py-12 text-center text-destructive">{(error as Error).message}</div>
  ),
});

function ScorecardPage() {
  const { id } = Route.useParams();
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        title="Scorecard"
        description="Seven dimensions, configured weights, and a full explanation of how the priority score was reached. Each recorded result is immutable."
        actions={
          <Link
            to="/studio/use-case/$id"
            params={{ id }}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            Use case overview
          </Link>
        }
      />
      <UseCaseScorecard id={id} />
    </div>
  );
}
