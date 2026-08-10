import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { WorkshopBoardView } from "@/components/workshop/WorkshopBoardView";

export const Route = createFileRoute("/_app/workshops/$id")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Workshop session — UseCasesX™" },
      {
        name: "description",
        content:
          "Run a facilitator-led AI discovery session: context, pain points, opportunity capture, use case generation, scoring, shortlist, conversion and outcome summary.",
      },
      { property: "og:title", content: "Workshop session — UseCasesX™" },
      {
        property: "og:description",
        content: "Structured collaboration from context to a decision-ready outcome summary.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkshopDetailPage,
});

function WorkshopDetailPage() {
  const { id } = Route.useParams();
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        title="Workshop session"
        description="The facilitator drives the stages; everyone works from the same screen."
        actions={
          <Link
            to="/workshops"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            All workshops
          </Link>
        }
      />
      <WorkshopBoardView id={id} />
    </div>
  );
}
