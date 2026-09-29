/**
 * Studio › Governance Readiness preview (FR-07 / V2-11).
 * Informational Canvas preview + consented CyberX C3G/SARN handoff package.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as studioRepo from "@/lib/domain/studio.repository";
import { RequirePlan } from "@/components/RequirePlan";
import { GovernanceReadinessPanel } from "@/components/governance/GovernanceReadinessPanel";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/studio/use-case/$id/c3g-governance")({
  head: () => privateHead("Governance readiness preview"),
  component: () => (
    <RequirePlan min="pro" feature="Governance readiness preview">
      <GovernancePreviewPage />
    </RequirePlan>
  ),
});

type UC = { id: string; title: string; workspace_id: string | null };

function GovernancePreviewPage() {
  const { id } = Route.useParams();
  const [uc, setUc] = useState<UC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await studioRepo
        .getStudioUseCase<UC>(id, "id,title,workspace_id")
        .catch(() => null);
      if (active) {
        setUc(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[960px] space-y-6 px-6 py-10">
        <header className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Governance readiness
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? "Loading…" : (uc?.title ?? "Use case")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Informational applicability preview for NIST AI RMF, ISO/IEC 42001, EU AI Act concepts
            and OWASP GenAI. Authoritative assessment happens in CyberX after a consented handoff.
          </p>
          <Link
            to="/studio/use-case/$id"
            params={{ id }}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Back to use case
          </Link>
        </header>

        {!loading && !uc?.workspace_id && (
          <p className="text-sm text-destructive">
            This use case has no workspace — governance preview cannot be saved.
          </p>
        )}

        {uc?.workspace_id && <GovernanceReadinessPanel useCaseId={uc.id} />}
      </div>
    </section>
  );
}
