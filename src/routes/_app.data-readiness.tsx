import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/data-readiness")({
  head: () => ({ meta: [{ title: "DataReadinessX™ — UseCasesX™" }, { name: "description", content: "Assess the data readiness of every AI use case." }] }),
  component: () => (
    <ModuleStub
      badge="DataReadinessX™"
      title="Data Readiness Assessment"
      description="Every AI use case lives or dies on data. DataReadinessX™ scores the volume, quality, lineage, governance, and access controls of the data each use case depends on."
      features={[
        "Data source inventory &amp; coverage",
        "Quality &amp; completeness scoring",
        "Lineage &amp; freshness checks",
        "Access &amp; sharing constraints",
        "Privacy &amp; sensitivity classification",
        "Readiness gap remediation plan",
      ]}
    />
  ),
});
