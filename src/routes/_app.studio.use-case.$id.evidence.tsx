import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as studioRepo from "@/lib/domain/studio.repository";
import { EvidencePanel } from "@/components/evidence/EvidencePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/studio/use-case/$id/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence — AI Use Case Studio" },
      {
        name: "description",
        content:
          "Attach link, note and file evidence with provenance, confidentiality and review status.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UseCaseEvidencePage,
});

type UC = {
  id: string;
  title: string;
  workspace_id: string | null;
  organization_id: string | null;
};

function UseCaseEvidencePage() {
  const { id } = Route.useParams();
  const [uc, setUc] = useState<UC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await studioRepo
        .getStudioUseCase<UC>(id, "id,title,workspace_id,organization_id")
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
            Evidence & provenance
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? "Loading…" : (uc?.title ?? "Use case")}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Reusable evidence for this use case — links, notes and authorised files. Audit events
            record metadata only (never document bodies, prompts or personal data).
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
            This use case has no workspace — evidence cannot be attached.
          </p>
        )}

        {uc?.workspace_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evidence register</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidencePanel
                workspaceId={uc.workspace_id}
                organizationId={uc.organization_id}
                subjectType="use_case"
                subjectId={uc.id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
