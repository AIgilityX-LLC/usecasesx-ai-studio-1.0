import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REQUEST_PRIORITIES,
  computeDueAt,
  requestPriorityLabel,
  slaState,
  type RequestPriority,
} from "@/lib/feedback/sla";

export interface RequestOwnerOption {
  userId: string;
  name: string;
}

const UNASSIGNED = "__unassigned__";

/** Datetime-local needs "YYYY-MM-DDTHH:mm" in local time, not an ISO instant. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Owner + priority + due date for one request. Priority is the SLA source of
 * truth: picking one recomputes the due date from the commitment window, and an
 * admin can still override the date when a request needs a bespoke deadline.
 */
export function RequestTriageControls({
  status,
  assignedTo,
  priority,
  dueAt,
  owners,
  busy,
  onSave,
}: {
  status: string;
  assignedTo: string | null;
  priority: string;
  dueAt: string | null;
  owners: RequestOwnerOption[];
  busy: boolean;
  onSave: (input: { assignedTo: string | null; priority: string; dueAt: string }) => void;
}) {
  const [owner, setOwner] = useState(assignedTo ?? UNASSIGNED);
  const [level, setLevel] = useState(priority);
  const [due, setDue] = useState(() => toLocalInput(dueAt ?? computeDueAt(priority)));

  const sla = slaState(dueAt, status);
  const ownerName = assignedTo
    ? (owners.find((o) => o.userId === assignedTo)?.name ?? "Assigned")
    : "Unassigned";

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">Owner: {ownerName}</Badge>
        <Badge variant="secondary">{requestPriorityLabel(priority)}</Badge>
        <Badge variant={sla.tone}>{sla.label}</Badge>
        {dueAt ? (
          <span className="text-muted-foreground">
            Due <time dateTime={dueAt}>{new Date(dueAt).toLocaleString()}</time>
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Assign to</Label>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {owners.map((option) => (
                <SelectItem key={option.userId} value={option.userId}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Priority (sets SLA)</Label>
          <Select
            value={level}
            onValueChange={(value) => {
              setLevel(value);
              setDue(toLocalInput(computeDueAt(value as RequestPriority)));
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_PRIORITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label} · {option.slaHours}h
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor={`due-${status}-${assignedTo ?? "none"}`}>
            Due by
          </Label>
          <input
            id={`due-${status}-${assignedTo ?? "none"}`}
            type="datetime-local"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <Button
        size="sm"
        disabled={busy || !due}
        onClick={() =>
          onSave({
            assignedTo: owner === UNASSIGNED ? null : owner,
            priority: level,
            dueAt: new Date(due).toISOString(),
          })
        }
      >
        Save owner &amp; SLA
      </Button>
    </div>
  );
}
