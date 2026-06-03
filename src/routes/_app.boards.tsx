import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/boards")({
  head: () => ({ meta: [{ title: "Use Case Boards — UseCasesX™" }, { name: "description", content: "Organize AI use cases on shared boards." }] }),
  component: () => (
    <ModuleStub
      badge="Use Case Boards"
      title="Collaborative AI Use Case Boards"
      description="Drag, group, and prioritize use cases on shared boards. Run portfolio reviews, quick-win sprints, and innovation backlogs across teams — with every move captured in the audit trail."
      features={[
        "Kanban &amp; matrix views",
        "Shared multi-team boards",
        "Tag, filter &amp; group",
        "Voting &amp; prioritization",
        "Comments &amp; mentions",
        "Promote board items to PortfolioX™",
      ]}
    />
  ),
});
