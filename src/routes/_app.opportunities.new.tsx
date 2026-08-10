import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { PageHeader } from "@/components/ui-kit";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import { emptyDraft, OPPORTUNITY_SOURCES, type OpportunitySource } from "@/lib/opportunities";

const searchSchema = z.object({
  source: z.enum(OPPORTUNITY_SOURCES).optional(),
  fromUseCase: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  reference: z.string().max(300).optional(),
});

export const Route = createFileRoute("/_app/opportunities/new")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Capture an Opportunity — UseCasesX™" },
      {
        name: "description",
        content:
          "Describe the business problem first: pain point, affected process, baseline, desired outcome, owner and evidence.",
      },
      { property: "og:title", content: "Capture an Opportunity — UseCasesX™" },
      {
        property: "og:description",
        content: "Frame the business problem before designing an AI solution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewOpportunityPage,
});

function NewOpportunityPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const initial = emptyDraft({
    source: (search.source as OpportunitySource | undefined) ?? "scratch",
    title: search.title ?? "",
    sourceReference: search.reference ?? "",
  });

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        eyebrow="Capture"
        title="Capture an opportunity"
        description="Start with the problem. Only a short name is required — everything else can be added as you learn more."
      />
      <OpportunityForm
        initial={initial}
        sourceUseCaseId={search.fromUseCase ?? null}
        onSaved={(id) => navigate({ to: "/opportunities/$id", params: { id }, replace: true })}
      />
    </div>
  );
}
