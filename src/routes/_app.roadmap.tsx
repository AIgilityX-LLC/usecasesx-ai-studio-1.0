import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/roadmap")({
  head: () => ({ meta: [{ title: "RoadmapX™ — UseCasesX™" }, { name: "description", content: "Sequence prioritized use cases into a delivery roadmap." }] }),
  component: () => (
    <ModuleStub
      badge="RoadmapX™"
      title="AI Delivery Roadmaps"
      description="Sequence prioritized portfolios into multi-quarter delivery roadmaps with milestones, dependencies, value gates, and governance checkpoints."
      features={[
        "Multi-quarter roadmap timeline",
        "Dependencies &amp; sequencing",
        "Value &amp; risk gates",
        "Governance checkpoints",
        "Resource &amp; budget alignment",
        "Board-ready roadmap export",
      ]}
    />
  ),
});
