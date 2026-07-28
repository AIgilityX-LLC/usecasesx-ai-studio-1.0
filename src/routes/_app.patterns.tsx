import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/patterns")({
  head: () => ({
    meta: [
      { title: "Pattern Library — UseCasesX™" },
      { name: "description", content: "Reusable AI patterns across the repository." },
    ],
  }),
  component: () => (
    <ModuleStub
      badge="Pattern Library"
      title="Reusable AI Use Case Patterns"
      description="A curated library of cross-industry AI patterns — Document Intelligence, Agentic Workflows, Predictive Maintenance, Citizen Triage and more — each linked to the use cases, blueprints, and governance controls that apply."
      features={[
        "Cross-industry pattern catalogue",
        "AI type &amp; data shape filters",
        "Linked governance &amp; assurance controls",
        "Reference architectures &amp; KPIs",
        "Adapt-from-pattern in AI Use Case Studio™",
        "Pattern versioning &amp; provenance",
      ]}
    />
  ),
});
