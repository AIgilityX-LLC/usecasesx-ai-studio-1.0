/**
 * Admin-facing audit timeline for one pilot participant.
 *
 * Renders the recorded lifecycle of a seat — invite, claim, onboarding intake
 * and later revisions, activation, mission completion, revocation and any admin
 * status change with its actor and reason — and exports the same rows as CSV.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PilotAuditEvent, PilotCohortRow } from "@/lib/pilot/pilot.model";
import {
  buildParticipantTimeline,
  participantTimelineToCsv,
  PARTICIPANT_EVENT_LABEL,
  type CohortOnboardingProfile,
  type ParticipantEventKind,
} from "@/lib/pilot/pilot.enrollment-analytics";

const KIND_VARIANT: Record<
  ParticipantEventKind,
  "default" | "secondary" | "outline" | "destructive"
> = {
  invited: "outline",
  claimed: "secondary",
  onboarded: "secondary",
  onboarding_updated: "outline",
  activated: "default",
  completed: "default",
  revoked: "destructive",
  status_changed: "outline",
  admin: "outline",
};

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PilotParticipantTimeline({
  row,
  audit,
  onboarding,
}: {
  row: PilotCohortRow;
  audit: readonly PilotAuditEvent[];
  onboarding?: CohortOnboardingProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const events = useMemo(
    () => buildParticipantTimeline({ row, audit, onboarding: onboarding ?? null }),
    [row, audit, onboarding],
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ChevronDown
              className={`mr-1 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {open ? "Hide" : "Audit"} timeline ({events.length})
          </Button>
        </CollapsibleTrigger>
        {events.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              downloadCsv(
                `pilot-timeline-${row.email.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`,
                participantTimelineToCsv(row.email, events),
              );
              toast.success("Participant timeline downloaded");
            }}
          >
            <Download className="mr-1 h-4 w-4" aria-hidden="true" />
            CSV
          </Button>
        )}
      </div>
      <CollapsibleContent>
        {events.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">Nothing recorded for this seat yet.</p>
        ) : (
          <ol className="mt-2 space-y-2 border-l pl-4">
            {events.map((event, index) => (
              <li key={`${event.at}-${event.kind}-${index}`} className="text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={KIND_VARIANT[event.kind]}>
                    {PARTICIPANT_EVENT_LABEL[event.kind]}
                  </Badge>
                  <span className="font-medium text-foreground">{event.title}</span>
                  <span className="text-muted-foreground">
                    {new Date(event.at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{event.detail}</p>
                {event.actor && <p className="text-muted-foreground">Actor: {event.actor}</p>}
              </li>
            ))}
          </ol>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
