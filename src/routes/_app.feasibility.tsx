import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/feasibility")({
  head: () => ({ meta: [{ title: "FeasibilityX™ — UseCasesX™" }, { name: "description", content: "Assess the technical and organizational feasibility of every AI use case." }] }),
  component: () => (
    <ModuleStub
      badge="FeasibilityX™"
      title="Feasibility Assessment"
      description="Score the technical, organizational, and regulatory feasibility of any AI use case before committing investment. FeasibilityX™ turns subjective gut-checks into a structured, auditable signal."
      features={[
        "Technical complexity scoring",
        "Organizational readiness checklist",
        "Regulatory feasibility flags",
        "Effort &amp; time-to-value estimation",
        "Cross-team dependency mapping",
        "Go / No-Go / Defer recommendation",
      ]}
    />
  ),
});
