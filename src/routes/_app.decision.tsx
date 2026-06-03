import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/decision")({
  head: () => ({ meta: [{ title: "DecisionX™ — UseCasesX™" }, { name: "description", content: "Capture and audit every AI investment decision." }] }),
  component: () => (
    <ModuleStub
      badge="DecisionX™"
      title="AI Decision &amp; Approval"
      description="Capture every Go / No-Go / Defer decision with the evidence behind it. DecisionX™ turns AI investment governance into a queryable, auditable record across boards, committees, and portfolio reviews."
      features={[
        "Decision intake &amp; routing",
        "Board / committee approval flows",
        "Evidence attached to every decision",
        "Defer reasons &amp; re-review dates",
        "Decision history &amp; audit trail",
        "Sovereign-grade audit export",
      ]}
    />
  ),
});
