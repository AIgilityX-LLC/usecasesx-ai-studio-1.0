import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { UseCaseWizard } from "@/components/studio/UseCaseWizard";

export const Route = createFileRoute("/_app/studio/use-case/$id/wizard")({
  head: () => ({
    meta: [
      { title: "Design a use case — AI Use Case Studio™" },
      {
        name: "description",
        content:
          "Turn a captured opportunity into a structured, business-ready AI use case across nine guided steps, with validation, versioning and optional AI assistance.",
      },
      { property: "og:title", content: "Design a use case — AI Use Case Studio™" },
      {
        property: "og:description",
        content: "Nine guided steps from business problem to a versioned, decision-ready AI use case.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WizardPage,
});

function WizardPage() {
  const { id } = Route.useParams();
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        title="Design the use case"
        description="Nine steps from business problem to a decision-ready recommendation. Each step saves on its own."
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
      <UseCaseWizard id={id} />
    </div>
  );
}
