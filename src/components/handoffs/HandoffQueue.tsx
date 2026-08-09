/**
 * Handoff admin queue.
 *
 * Filters narrow the queue; bulk actions move several requests at once. Both
 * are deliberately conservative: a bulk move is applied request by request and
 * validated against the same transition table as a single move, so a selection
 * containing an illegal move reports that row back instead of forcing it.
 */

import { useMemo, useState } from "react";
import { ArrowRight, Filter, Loader2, Share2, X } from "lucide-react";

import { EmptyState } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HANDOFF_STATUSES,
  HANDOFF_STATUS_META,
  HANDOFF_TARGET_META,
  HANDOFF_TARGET_ORDER,
  nextStatuses,
  requestTypeLabel,
  sourceHasDrifted,
  type HandoffRequest,
  type HandoffStatus,
  type HandoffTarget,
} from "@/lib/handoffs/handoff.model";

export type QueueFilters = {
  search: string;
  target: HandoffTarget | "all";
  status: HandoffStatus | "all" | "open";
  owner: string | "all" | "unassigned" | "me";
  sourceVersion: string;
};

export const EMPTY_FILTERS: QueueFilters = {
  search: "",
  target: "all",
  status: "open",
  owner: "all",
  sourceVersion: "",
};

/** Pure filter so the behaviour is testable without a browser. */
export function applyQueueFilters(
  requests: HandoffRequest[],
  filters: QueueFilters,
  currentUserId: string | null,
): HandoffRequest[] {
  const needle = filters.search.trim().toLowerCase();
  const version = filters.sourceVersion.trim().toLowerCase();
  return requests.filter((request) => {
    if (filters.target !== "all" && request.target !== filters.target) return false;
    if (filters.status === "open" && nextStatuses(request.status).length === 0) return false;
    if (filters.status !== "all" && filters.status !== "open" && request.status !== filters.status)
      return false;
    if (filters.owner === "unassigned" && request.ownerUserId) return false;
    if (filters.owner === "me" && request.ownerUserId !== currentUserId) return false;
    if (
      filters.owner !== "all" &&
      filters.owner !== "unassigned" &&
      filters.owner !== "me" &&
      request.ownerUserId !== filters.owner
    )
      return false;
    if (version && !(request.sourceVersion?.fingerprint ?? "").toLowerCase().includes(version))
      return false;
    if (needle) {
      const haystack = [
        request.title,
        request.summary ?? "",
        requestTypeLabel(request.target, request.requestType),
        HANDOFF_TARGET_META[request.target].label,
        ...request.sourceRefs.map((ref) => ref.label),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/** Status moves legal for every request in a selection. */
export function commonNextStatuses(requests: HandoffRequest[]): HandoffStatus[] {
  if (requests.length === 0) return [];
  return HANDOFF_STATUSES.filter((status) =>
    requests.every((request) => nextStatuses(request.status).includes(status)),
  );
}

function toneClass(tone: "neutral" | "info" | "positive" | "warning") {
  switch (tone) {
    case "positive":
      return "border-primary/40 text-primary";
    case "warning":
      return "border-destructive/40 text-destructive";
    case "info":
      return "border-accent-foreground/30 text-accent-foreground";
    default:
      return "border-border text-muted-foreground";
  }
}

export function HandoffQueue({
  requests,
  currentUserId,
  busy,
  onStatusChange,
  onBulkStatus,
  onExport,
}: {
  requests: HandoffRequest[];
  currentUserId: string | null;
  busy: boolean;
  onStatusChange: (request: HandoffRequest, next: HandoffStatus) => void;
  onBulkStatus: (requests: HandoffRequest[], next: HandoffStatus) => void;
  onExport: (request: HandoffRequest) => void;
}) {
  const [filters, setFilters] = useState<QueueFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const owners = useMemo(() => {
    const ids = new Set<string>();
    for (const request of requests) if (request.ownerUserId) ids.add(request.ownerUserId);
    return [...ids];
  }, [requests]);

  const visible = useMemo(
    () => applyQueueFilters(requests, filters, currentUserId),
    [requests, filters, currentUserId],
  );

  const selectedRequests = visible.filter((request) => selected[request.id]);
  const bulkStatuses = commonNextStatuses(selectedRequests);
  const allVisibleSelected = visible.length > 0 && selectedRequests.length === visible.length;

  const set = <K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" aria-hidden />
            Filter the queue
          </CardTitle>
          <CardDescription>
            Showing {visible.length} of {requests.length} request
            {requests.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="queue-search">Search</Label>
            <Input
              id="queue-search"
              data-testid="queue-search"
              value={filters.search}
              placeholder="Title, summary or reference"
              onChange={(event) => set("search", event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="queue-target">Target</Label>
            <Select
              value={filters.target}
              onValueChange={(value) => set("target", value as QueueFilters["target"])}
            >
              <SelectTrigger id="queue-target" data-testid="queue-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All targets</SelectItem>
                {HANDOFF_TARGET_ORDER.map((target) => (
                  <SelectItem key={target} value={target}>
                    {HANDOFF_TARGET_META[target].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="queue-status">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => set("status", value as QueueFilters["status"])}
            >
              <SelectTrigger id="queue-status" data-testid="queue-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open only</SelectItem>
                <SelectItem value="all">Any status</SelectItem>
                {HANDOFF_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {HANDOFF_STATUS_META[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="queue-owner">Owner</Label>
            <Select value={filters.owner} onValueChange={(value) => set("owner", value)}>
              <SelectTrigger id="queue-owner" data-testid="queue-owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                <SelectItem value="me">Assigned to me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {owners.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id === currentUserId ? "You" : `Member ${id.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="queue-version">Source version</Label>
            <Input
              id="queue-version"
              data-testid="queue-version"
              value={filters.sourceVersion}
              placeholder="Fingerprint"
              onChange={(event) => set("sourceVersion", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <Checkbox
          id="queue-select-all"
          checked={allVisibleSelected}
          onCheckedChange={(checked) =>
            setSelected(
              checked === true
                ? Object.fromEntries(visible.map((request) => [request.id, true]))
                : {},
            )
          }
          aria-label="Select all filtered requests"
          data-testid="queue-select-all"
        />
        <Label htmlFor="queue-select-all" className="text-sm">
          {selectedRequests.length} selected
        </Label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {selectedRequests.length > 0 && bulkStatuses.length === 0 && (
            <span className="text-xs text-muted-foreground" data-testid="bulk-no-common">
              No status move applies to every selected request.
            </span>
          )}
          {bulkStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={busy}
              data-testid={`bulk-${status}`}
              onClick={() => onBulkStatus(selectedRequests, status)}
            >
              {HANDOFF_STATUS_META[status].label}
              <ArrowRight className="ml-2 h-3 w-3" aria-hidden />
            </Button>
          ))}
          {selectedRequests.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
              <X className="mr-1 h-3 w-3" aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No requests match these filters"
          description="Widen the search, or clear the target, status and owner filters."
        />
      ) : (
        <div className="space-y-3" data-testid="handoff-queue-list">
          {visible.map((request) => {
            const statusMeta = HANDOFF_STATUS_META[request.status];
            const drifted = sourceHasDrifted(request.sourceVersion, request.sourceRefs);
            return (
              <Card key={request.id} data-testid={`handoff-row-${request.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={Boolean(selected[request.id])}
                        onCheckedChange={(checked) =>
                          setSelected((prev) => ({ ...prev, [request.id]: checked === true }))
                        }
                        aria-label={`Select ${request.title}`}
                      />
                      <div>
                        <CardTitle className="text-base">{request.title}</CardTitle>
                        <CardDescription>
                          {HANDOFF_TARGET_META[request.target].label} ·{" "}
                          {requestTypeLabel(request.target, request.requestType)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={toneClass(statusMeta.tone)}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {request.summary && <p className="text-muted-foreground">{request.summary}</p>}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Raised {new Date(request.createdAt).toLocaleString()}</span>
                    <span>·</span>
                    <span>
                      {request.sourceRefs.length} reference
                      {request.sourceRefs.length === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span data-testid={`fingerprint-${request.id}`}>
                      Source version {request.sourceVersion?.fingerprint ?? "unknown"}
                    </span>
                    <span>·</span>
                    <span>{request.deliveryMode === "endpoint" ? "Sent" : "Queued"}</span>
                    <span>·</span>
                    <span data-testid={`consent-${request.id}`}>
                      Consent {request.consent?.confirmed ? "confirmed" : "not confirmed"}
                    </span>
                  </div>
                  {drifted && (
                    <p className="text-xs text-destructive">
                      The referenced records have changed since this request was raised.
                    </p>
                  )}
                  {request.statusNote && (
                    <p className="rounded-md bg-muted p-2 text-xs">{request.statusNote}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses(request.status).map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusChange(request, next)}
                      >
                        {HANDOFF_STATUS_META[next].label}
                        <ArrowRight className="ml-2 h-3 w-3" aria-hidden />
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onExport(request)}
                      data-testid={`export-${request.id}`}
                    >
                      <Share2 className="mr-2 h-3 w-3" aria-hidden />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
