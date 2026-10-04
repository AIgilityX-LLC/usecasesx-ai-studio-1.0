/**
 * Evidence activity view — append-only audit trail for evidence actions.
 * Metadata is already redacted at write time (no bodies/prompts/secrets/PII).
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEvidenceActivityFn } from "@/lib/evidence/evidence.functions";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  "evidence.attached": "Attached",
  "evidence.updated": "Updated",
  "evidence.revoked": "Revoked",
  "evidence.accessed": "File accessed",
};

export function EvidenceActivityView({
  workspaceId,
  subjectId,
}: {
  workspaceId: string;
  subjectId?: string;
}) {
  const fetchActivity = useServerFn(listEvidenceActivityFn);
  const query = useQuery({
    queryKey: ["evidence-activity", workspaceId, subjectId ?? null],
    queryFn: () =>
      fetchActivity({
        data: { workspaceId, subjectId, limit: 50 },
      }),
    enabled: Boolean(workspaceId),
  });

  const rows = (query.data ?? []) as any[];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Evidence activity</h3>
      {query.isLoading && (
        <p className="text-xs text-muted-foreground">Loading activity…</p>
      )}
      {query.isError && (
        <p className="text-xs text-muted-foreground">Activity unavailable.</p>
      )}
      {!query.isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">No evidence events yet.</p>
      )}
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-2 rounded border border-border/60 px-2 py-1.5 text-xs"
          >
            <Badge variant="outline">{LABELS[row.eventType] ?? row.eventType}</Badge>
            <span className="text-muted-foreground">
              {new Date(row.createdAt).toLocaleString()}
            </span>
            {typeof row.metadata?.label === "string" && (
              <span className="truncate font-medium">{row.metadata.label}</span>
            )}
            {typeof row.metadata?.kind === "string" && (
              <span className="text-muted-foreground">{row.metadata.kind}</span>
            )}
            {row.requestId && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {row.requestId.slice(0, 8)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
