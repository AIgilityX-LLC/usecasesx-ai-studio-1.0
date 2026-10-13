import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Bot,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  aiUsageAnalyticsFn,
  listExportAuditFn,
  securityAlertsFn,
} from "@/lib/observability.functions";
import { outcomeLabel, RETRY_SHIELD } from "@/lib/observability/observability.model";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toUserMessage } from "@/lib/domain/errors";
import { RequireCapability } from "@/components/RequireCapability";

export const Route = createFileRoute("/_app/admin-observability")({
  head: () => ({
    meta: [
      { title: "Export & AI Activity — UseCasesX™ Admin" },
      {
        name: "description",
        content:
          "Workspace-admin view of export and download activity, AI usage analytics and abuse alerts.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <RequireCapability capability="workspace.manage" action="view export and AI activity trails">
      <Observability />
    </RequireCapability>
  ),
});

const WINDOWS = [7, 30, 90] as const;

function NotAuthorized({ reason }: { reason: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Workspace admins only
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{reason}</CardContent>
    </Card>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y text-sm">{children}</div>;
}

function Loading() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function when(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Observability() {
  const [windowDays, setWindowDays] = useState<number>(30);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Export &amp; AI activity</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Who took data out of this workspace, how AI capacity is being consumed, and which abuse
          signals crossed an alert threshold. Records are append-only and scoped to workspaces you
          administer.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              size="sm"
              variant={windowDays === w ? "default" : "outline"}
              onClick={() => setWindowDays(w)}
            >
              Last {w} days
            </Button>
          ))}
        </div>
      </header>

      <Tabs defaultValue="exports">
        <TabsList>
          <TabsTrigger value="exports" className="gap-1.5">
            <Download className="h-3.5 w-3.5" aria-hidden /> Exports
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" aria-hidden /> AI usage
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exports" className="pt-4">
          <ExportAudit windowDays={windowDays} />
        </TabsContent>
        <TabsContent value="ai" className="pt-4">
          <AiUsage windowDays={windowDays} />
        </TabsContent>
        <TabsContent value="alerts" className="pt-4">
          <Alerts windowDays={windowDays} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------- exports tab */

function ExportAudit({ windowDays }: { windowDays: number }) {
  const fetchAudit = useServerFn(listExportAuditFn);
  const [term, setTerm] = useState("");
  const query = useQuery({
    queryKey: ["export-audit", windowDays],
    queryFn: () => fetchAudit({ data: { windowDays } }),
  });

  const rows = useMemo(() => {
    if (!query.data || query.data.authorized === false) return [];
    const t = term.trim().toLowerCase();
    const all = query.data.rows;
    if (!t) return all;
    return all.filter((r) =>
      [r.actorName, r.workspaceName, r.format, r.subject, r.reason, r.requestId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [query.data, term]);

  if (query.isLoading) return <Loading />;
  if (query.error) return <p className="text-sm text-destructive">{toUserMessage(query.error)}</p>;
  if (query.data && query.data.authorized === false)
    return <NotAuthorized reason={query.data.reason} />;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Export &amp; download log</CardTitle>
            <CardDescription>
              Every generated artefact and every refusal, with actor, workspace and timestamp.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search actor, report, format or trace id"
            className="pl-8"
            aria-label="Search export log"
          />
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No export or download activity recorded in this window.
          </p>
        ) : (
          <Rows>
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-start gap-3 py-3">
                <Badge
                  variant={r.outcome === "downloaded" ? "secondary" : "destructive"}
                  className="shrink-0"
                >
                  {outcomeLabel(r.outcome)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {r.actorName}
                    <span className="text-muted-foreground"> · {r.workspaceName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[r.format?.toUpperCase(), r.subject ?? r.entityType]
                      .filter(Boolean)
                      .join(" · ") || "Report export"}
                    {r.reason ? ` — ${r.reason}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{when(r.at)}</p>
                  {r.requestId ? <p className="font-mono">{r.requestId.slice(0, 8)}</p> : null}
                </div>
              </div>
            ))}
          </Rows>
        )}
        <p className="pt-4 text-xs text-muted-foreground">
          Retry shield: after {RETRY_SHIELD.maxFailures} refused attempts within{" "}
          {RETRY_SHIELD.windowSeconds / 60} minutes, further download attempts are refused for{" "}
          {RETRY_SHIELD.cooldownSeconds} seconds and logged as “Throttled”.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ ai tab */

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function AiUsage({ windowDays }: { windowDays: number }) {
  const fetchUsage = useServerFn(aiUsageAnalyticsFn);
  const query = useQuery({
    queryKey: ["ai-usage-analytics", windowDays],
    queryFn: () => fetchUsage({ data: { windowDays } }),
  });

  if (query.isLoading) return <Loading />;
  if (query.error) return <p className="text-sm text-destructive">{toUserMessage(query.error)}</p>;
  if (!query.data) return null;
  if (query.data.authorized === false) return <NotAuthorized reason={query.data.reason} />;

  const a = query.data.analytics;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Prompts" value={a.totals.prompts} />
        <Metric label="Failures" value={a.totals.failures} />
        <Metric label="Tokens (spend proxy)" value={a.totals.totalTokens.toLocaleString()} />
        <Metric label="Rate limits enforced" value={a.totals.rateLimited} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per user</CardTitle>
          <CardDescription>
            Prompt volume, failures and token spend proxy for the last {a.windowDays} days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {a.byUser.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No AI activity in this window.</p>
          ) : (
            <Rows>
              {a.byUser.map((b) => (
                <div key={b.key} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 font-medium">{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.prompts} prompts</span>
                  <span className="text-xs text-muted-foreground">{b.failures} failed</span>
                  <span className="text-xs text-muted-foreground">
                    {b.totalTokens.toLocaleString()} tokens
                  </span>
                  {b.rateLimited > 0 ? (
                    <Badge variant="destructive">{b.rateLimited} rate-limited</Badge>
                  ) : null}
                </div>
              ))}
            </Rows>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per workspace</CardTitle>
          </CardHeader>
          <CardContent>
            {a.byWorkspace.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded.</p>
            ) : (
              <Rows>
                {a.byWorkspace.map((b) => (
                  <div key={b.key} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 font-medium">{b.label}</span>
                    <span className="text-xs text-muted-foreground">{b.prompts} prompts</span>
                    <span className="text-xs text-muted-foreground">
                      {b.totalTokens.toLocaleString()} tokens
                    </span>
                  </div>
                ))}
              </Rows>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Failure kinds</CardTitle>
          </CardHeader>
          <CardContent>
            {a.failureKinds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failures recorded.</p>
            ) : (
              <Rows>
                {a.failureKinds.map((f) => (
                  <div key={f.kind} className="flex items-center justify-between py-2.5">
                    <span className="font-mono text-xs">{f.kind}</span>
                    <span className="text-xs text-muted-foreground">{f.count}</span>
                  </div>
                ))}
              </Rows>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- alerts tab */

function Alerts({ windowDays }: { windowDays: number }) {
  const fetchAlerts = useServerFn(securityAlertsFn);
  const query = useQuery({
    queryKey: ["security-alerts", windowDays],
    queryFn: () => fetchAlerts({ data: { windowDays } }),
  });

  if (query.isLoading) return <Loading />;
  if (query.error) return <p className="text-sm text-destructive">{toUserMessage(query.error)}</p>;
  if (!query.data) return null;
  if (query.data.authorized === false) return <NotAuthorized reason={query.data.reason} />;

  const triggered = query.data.alerts.filter((a) => a.triggered);

  return (
    <div className="space-y-4">
      {triggered.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            No alert thresholds crossed in the last {windowDays} days.
          </CardContent>
        </Card>
      ) : null}

      {query.data.alerts.map((alert) => (
        <Card key={alert.id} className={alert.triggered ? "border-destructive/50" : undefined}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {alert.triggered ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
                {alert.title}
              </CardTitle>
              <Badge variant={alert.triggered ? "destructive" : "secondary"}>
                {alert.count} / {alert.threshold} in {alert.windowHours}h
              </Badge>
            </div>
            <CardDescription>{alert.guidance}</CardDescription>
          </CardHeader>
          {alert.actors.length > 0 ? (
            <CardContent>
              <Rows>
                {alert.actors.map((actor) => (
                  <div
                    key={actor.actorId ?? "unknown"}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="font-medium">{actor.actorName}</span>
                    <span className="text-xs text-muted-foreground">{actor.count} events</span>
                  </div>
                ))}
              </Rows>
              <p className="pt-3 text-xs text-muted-foreground">Last event {when(alert.lastAt)}</p>
            </CardContent>
          ) : null}
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent signals</CardTitle>
          <CardDescription>
            Raw cross-workspace, storage, export and rate-limit refusals behind the alerts above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.data.signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded in this window.</p>
          ) : (
            <Rows>
              {query.data.signals.slice(0, 50).map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Badge variant={s.severity === "critical" ? "destructive" : "secondary"}>
                    {s.severity}
                  </Badge>
                  <span className="font-mono text-xs">{s.eventType}</span>
                  <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                    {s.actorName}
                    {s.detail ? ` — ${s.detail}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">{when(s.at)}</span>
                </div>
              ))}
            </Rows>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
