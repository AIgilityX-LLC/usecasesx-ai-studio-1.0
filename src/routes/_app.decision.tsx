import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonGate } from "@/components/ComingSoonGate";

export const Route = createFileRoute("/_app/decision")({
  head: () => ({ meta: [{ title: "DecisionX™ — UseCasesX™" }, { name: "description", content: "Capture and audit every AI investment decision." }] }),
  component: () => (
    <ComingSoonGate
      feature="DecisionX™ — Decision Provenance Report™"
      sourcePage="/decision"
      description="Capture every Go / No-Go / Defer decision with the evidence behind it. DecisionX™ turns AI investment governance into a queryable, auditable record across boards, committees, and portfolio reviews."
      features={[
        "Decision intake & routing",
        "Board / committee approval flows",
        "Evidence attached to every decision",
        "Defer reasons & re-review dates",
        "Decision history & audit trail",
        "Sovereign-grade audit export",
      ]}
    />
  ),
});
