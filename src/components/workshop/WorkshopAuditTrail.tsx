/**
 * Per-stage audit trail: who submitted, who scored, who converted and when.
 * Reconstructed from recorded rows plus the append-only audit stream.
 */

import { useQuery } from "@tanstack/react-query";
import { Download, FileText, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AUDIT_ACTION_LABEL,
  downloadWorkshopAuditCSV,
  downloadWorkshopAuditPDF,
  groupAuditByStage,
} from "@/lib/workshops.collab";
import { STAGE_META, type WorkshopStage } from "@/lib/workshops";
import { getWorkshopAuditFn } from "@/lib/workshops.functions";

export function WorkshopAuditTrail({
  workshopId,
  stage,
  workshopTitle = "Workshop",
}: {
  workshopId: string;
  /** When set, only this stage's entries are shown. */
  stage?: WorkshopStage;
  /** Used to name exported files. */
  workshopTitle?: string;
}) {
  const audit = useQuery({
    queryKey: ["workshop-audit", workshopId],
    queryFn: () => getWorkshopAuditFn({ data: { workshopId } }),
  });

  const groups = groupAuditByStage(audit.data ?? []).filter((g) => !stage || g.stage === stage);
  const visible = groups.flatMap((g) => g.entries);
  const exportTitle = stage ? `${workshopTitle} — ${STAGE_META[stage].label}` : workshopTitle;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Audit trail
          {stage ? ` — ${STAGE_META[stage].label}` : ""}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={visible.length === 0}
            onClick={() => downloadWorkshopAuditCSV(visible, exportTitle)}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={visible.length === 0}
            onClick={() => downloadWorkshopAuditPDF(visible, exportTitle)}
          >
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {audit.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : audit.isError ? (
          <p className="text-sm text-destructive">Activity could not be loaded.</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been recorded here yet.</p>
        ) : (

          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.stage} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STAGE_META[group.stage].label}
                </div>
                <ul className="space-y-1.5">
                  {group.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <Badge variant="outline">{AUDIT_ACTION_LABEL[entry.action]}</Badge>
                      <span className="font-medium">{entry.actorName}</span>
                      <span className="min-w-0 flex-1 text-muted-foreground">{entry.summary}</span>
                      <time
                        dateTime={entry.at}
                        className="text-xs tabular-nums text-muted-foreground"
                      >
                        {new Date(entry.at).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
