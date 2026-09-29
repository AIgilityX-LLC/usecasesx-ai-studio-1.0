import { createFileRoute, Link } from "@tanstack/react-router";
import { ImplementationBriefPanel } from "@/components/roadmap/ImplementationBriefPanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/studio/use-case/$id/brief")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Implementation brief — AI Use Case Studio" },
      {
        name: "description",
        content:
          "Versioned implementation brief: outcomes, scope, assumptions, architecture, data needs, controls, measures and acceptance criteria.",
      },
    ],
  }),
  component: BriefPage,
});

function BriefPage() {
  const { id } = Route.useParams();
  return (
    <section className="container max-w-3xl py-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Implementation brief</h1>
        <Button variant="outline" asChild>
          <Link to="/studio/use-case/$id" params={{ id }}>
            Back to canvas
          </Link>
        </Button>
      </div>
      <ImplementationBriefPanel useCaseId={id} />
    </section>
  );
}
