import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/blueprint")({
  head: () => ({ meta: [{ title: "BlueprintX™ — UseCasesX™" }, { name: "description", content: "Generate technical blueprints for AI use cases." }] }),
  component: () => (
    <ModuleStub
      badge="BlueprintX™"
      title="AI Solution Blueprints"
      description="Convert a prioritized use case into a delivery-ready technical blueprint: architecture, data flows, models, integration points, governance controls, and success metrics."
      features={[
        "Reference architectures by AI type",
        "Model + platform recommendations",
        "Integration points &amp; APIs",
        "Governance &amp; control mapping",
        "Cost &amp; effort estimation",
        "Export-ready solution brief",
      ]}
    />
  ),
});
