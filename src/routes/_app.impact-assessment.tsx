import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/impact-assessment")({
  head: () => ({
    meta: [
      { title: "ImpactAssessmentX™ — UseCasesX™" },
      { name: "description", content: "Quantify the expected impact of every AI use case." },
    ],
  }),
  component: () => (
    <ModuleStub
      badge="ImpactAssessmentX™"
      title="Impact &amp; ROI Assessment"
      description="Quantify the expected business, citizen, and risk impact of each AI use case before commitment. Translate intangible AI ambition into hard expected value."
      features={[
        "Revenue, cost, risk &amp; experience modelling",
        "Citizen / customer outcome metrics",
        "Confidence intervals &amp; sensitivity analysis",
        "Time-to-value modelling",
        "Comparison across alternatives",
        "Board-ready impact brief",
      ]}
    />
  ),
});
