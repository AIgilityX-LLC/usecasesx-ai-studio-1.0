import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonGate } from "@/components/ComingSoonGate";

export const Route = createFileRoute("/_app/roadmap")({
  head: () => ({ meta: [{ title: "RoadmapX™ — UseCasesX™" }, { name: "description", content: "Sequence prioritized use cases into a delivery roadmap." }] }),
  component: () => (
    <ComingSoonGate
      feature="RoadmapX™ — AI Delivery Roadmaps"
      sourcePage="/roadmap"
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
