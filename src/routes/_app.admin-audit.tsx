import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSubmissionAudit } from "@/lib/submissions.audit.functions";
import { auditEventLabel } from "@/lib/submissions.audit";
import { statusBadgeClass, statusLabel } from "@/lib/submissions";
import { toUserMessage } from "@/lib/domain/errors";
import { RequireRoles } from "@/components/RequireRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Fingerprint, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin-audit")({
  head: () => ({
    meta: [
      { title: "Submission Audit Trail — UseCasesX™ Admin" },
      {
        name: "description",
        content:
          "Reviewer decisions, status changes and approvals for community use-case submissions.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <RequireRoles
      anyOf={[
        "admin",
        "moderator",
        "super_admin",
        "ai_hub_admin",
        "usecasex_admin",
        "content_manager",
        "reviewer",
      ]}
      action="view the submission audit trail"
    >
      <AdminAudit />
    </RequireRoles>
  ),
});

function AdminAudit() {
  const fetchAudit = useServerFn(listSubmissionAudit);
  const [term, setTerm] = useState("");
  const [trace, setTrace] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["submission-audit", trace],
    queryFn: () => fetchAudit({ data: trace ? { correlationId: trace } : {} }),
  });

  const rows = useMemo(() => {
    const all = query.data?.rows ?? [];
    const t = term.trim().toLowerCase();
    if (!t) return all;
    return all.filter((r) =>
      [r.submissionTitle, r.actorName, r.correlationId, r.eventType, r.reviewNotes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [query.data, term]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Governance
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Submission audit trail</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every status change, reviewer note and approval on community submissions, in order. Each
          entry carries the correlation ID of the request that produced it, so one submit → review →
          publish flow can be traced end to end.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Filter by use case, reviewer, note or trace ID"
            aria-label="Filter audit entries"
            className="pl-9"
          />
        </div>
        {trace ? (
          <Button variant="outline" onClick={() => setTrace(null)}>
            Clear trace filter
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => {
            query.refetch().catch((e) => toast.error(toUserMessage(e)));
          }}
          disabled={query.isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {trace ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Showing one flow: <span className="font-mono">{trace}</span>
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">{toUserMessage(query.error)}</p>
            <Button className="mt-4" variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No audit entries yet. Saving, submitting, reviewing or publishing a community use case
            records an entry here.
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {r.submissionTitle ?? "Untitled submission"}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {auditEventLabel(r.eventType)} ·{" "}
                      {new Date(r.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.fromStatus ? (
                      <Badge className={statusBadgeClass(r.fromStatus)} variant="secondary">
                        {statusLabel(r.fromStatus)}
                      </Badge>
                    ) : null}
                    {r.fromStatus && r.toStatus ? (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : null}
                    {r.toStatus ? (
                      <Badge className={statusBadgeClass(r.toStatus)} variant="secondary">
                        {statusLabel(r.toStatus)}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {r.eventType === "submission.published" ||
                      r.eventType === "use_case.published_from_submission"
                        ? "Approved & published by"
                        : "Actor"}
                      :
                    </span>{" "}
                    {r.actorName ?? (r.actorId ? `${r.actorId.slice(0, 8)}…` : "Unknown")}
                  </p>
                  {r.reviewNotes ? (
                    <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
                      “{r.reviewNotes}”
                    </blockquote>
                  ) : null}
                  {r.publishedSlug ? (
                    <p className="text-muted-foreground">
                      Published as <span className="font-mono">/use-cases/{r.publishedSlug}</span>
                    </p>
                  ) : null}
                  {r.correlationId ? (
                    <button
                      type="button"
                      onClick={() => setTrace(r.correlationId)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Show all entries for trace ${r.correlationId}`}
                    >
                      <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
                      {r.correlationId}
                    </button>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
