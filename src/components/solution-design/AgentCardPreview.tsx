import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentCardPreview } from "@/lib/solution-design/model";

const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  confirmed: "secondary",
  ai_draft: "outline",
  missing: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  ai_draft: "AI draft",
  missing: "Missing",
};

/**
 * AI System / Agent Card — preview from confirmed capture only.
 * Never invents values; marks missing and AI-drafted fields.
 */
export function AgentCardPreviewView({ card }: { card: AgentCardPreview }) {
  return (
    <Card>
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-base">{card.title}</CardTitle>
        <div className="flex flex-wrap gap-2 text-xs">
          {card.solutionTypeLabel ? (
            <Badge variant="secondary">{card.solutionTypeLabel}</Badge>
          ) : (
            <Badge variant="outline">Solution type missing</Badge>
          )}
          {card.autonomyLabel ? <Badge variant="outline">{card.autonomyLabel}</Badge> : null}
          <Badge variant="outline">{card.confirmedCount} confirmed</Badge>
          {card.aiDraftCount > 0 ? (
            <Badge variant="outline">{card.aiDraftCount} AI draft</Badge>
          ) : null}
          {card.missingCount > 0 ? (
            <Badge variant="destructive">{card.missingCount} missing</Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{card.disclaimer}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-3">
          {card.fields.map((f) => (
            <div key={f.key} className="rounded-md border border-border p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <dt className="text-sm font-medium text-foreground">{f.label}</dt>
                <Badge variant={STATUS_TONE[f.status] ?? "outline"} className="text-[10px]">
                  {STATUS_LABEL[f.status] ?? f.status}
                </Badge>
              </div>
              <dd className="whitespace-pre-wrap text-sm text-muted-foreground">
                {f.value ?? "— not captured —"}
              </dd>
            </div>
          ))}
        </dl>

        {card.pilot.isAgentic && (
          <div
            className={
              card.pilot.ready
                ? "rounded-md border border-border bg-muted/40 p-3 text-sm"
                : "rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
            }
            role="status"
          >
            <p className="font-medium">
              {card.pilot.ready
                ? "Pilot Authorization controls complete"
                : "Not Pilot Authorization ready"}
            </p>
            {card.pilot.blockers.length > 0 && (
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {card.pilot.blockers.map((b) => (
                  <li key={b.field}>· {b.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          OWASP prompt pack {card.owaspPackVersion} — informational readiness only.
        </p>
      </CardContent>
    </Card>
  );
}
