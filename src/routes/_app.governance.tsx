import { createFileRoute } from "@tanstack/react-router";
import { ModuleStub } from "@/components/ModuleStub";

export const Route = createFileRoute("/_app/governance")({
  head: () => ({ meta: [{ title: "GovernanceX™ — UseCasesX™" }, { name: "description", content: "Apply governance controls to every AI use case." }] }),
  component: () => (
    <ModuleStub
      badge="GovernanceX™"
      title="AI Governance Workspace"
      description="Apply the right governance controls to every use case based on risk, sector, and jurisdiction. GovernanceX™ orchestrates intake, review, control mapping, and approval — and feeds CyberX C3G™ for full assurance."
      features={[
        "Risk-tier classification",
        "Control mapping (NIST AI RMF, ISO 42001, EU AI Act, local laws)",
        "Review workflows &amp; sign-offs",
        "Policy library &amp; exceptions",
        "Evidence capture &amp; audit trail",
        "Hand-off to CyberX C3G™",
      ]}
    />
  ),
});
