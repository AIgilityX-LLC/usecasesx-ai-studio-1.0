/**
 * Production readiness — what the deployment actually looks like right now:
 * host and HTTPS contract, which server-side secret names resolve (never their
 * values), the auth/email sender and capacity picture, database and storage
 * envelope, AI quotas and outage behaviour, and who owns an incident.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Download, HelpCircle, XCircle } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getProductionConfigFn } from "@/lib/ops/ops.functions";
import {
  AREA_LABEL,
  CANONICAL_HOST,
  CONFIG_AREAS,
  buildProductionConfigMarkdown,
  countByStatus,
  probesForArea,
  productionConfigCsv,
  reportVerdict,
  type ProbeStatus,
} from "@/lib/ops/production-config";
import {
  DRILL_MAX_AGE_DAYS,
  RECOVERY_DRILL,
  drillAgeDays,
  drillProbeStatus,
  drillSummary,
} from "@/lib/ops/recovery-drill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/platform-admin/production-readiness")({
  head: () => privateHead("Production readiness"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="view the production configuration">
      <ProductionReadinessPage />
    </RequireRoles>
  ),
});

function statusBadge(status: ProbeStatus) {
  if (status === "pass") return <Badge variant="default">Pass</Badge>;
  if (status === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (status === "attention") return <Badge variant="secondary">Attention</Badge>;
  return <Badge variant="outline">Not measured</Badge>;
}

function statusIcon(status: ProbeStatus) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive" aria-hidden />;
  if (status === "attention")
    return <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

function download(filename: string, mime: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function ProductionReadinessPage() {
  const fetchConfig = useServerFn(getProductionConfigFn);
  const { data, isLoading, error } = useQuery({
    queryKey: ["production-config"],
    queryFn: () => fetchConfig(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>Configuration unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "The production configuration could not be read."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const counts = countByStatus(data.probes);
  const verdict = reportVerdict(data.probes);
  const stamp = data.generatedAt.slice(0, 10);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Production readiness</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Observed configuration for {data.release.version} (target {data.release.targetDate}).
          Secrets are reported by name and presence only — no value is read into this page.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>
            {verdict === "ready"
              ? "Ready"
              : verdict === "conditional"
                ? "Conditional — open items below"
                : "Blocked"}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                download(
                  `production-config-${stamp}.md`,
                  "text/markdown",
                  buildProductionConfigMarkdown(data),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Markdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                download(`production-config-${stamp}.csv`, "text/csv", productionConfigCsv(data))
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Pass" value={String(counts.pass)} />
          <Fact label="Attention" value={String(counts.attention)} />
          <Fact label="Fail" value={String(counts.fail)} />
          <Fact label="Not measured" value={String(counts.unknown)} />
          <Fact label="Canonical host" value={CANONICAL_HOST} />
          <Fact label="Observed host" value={data.observedHost} />
          <Fact label="Release marker" value={data.release.marker} />
          <Fact label="Generated by" value={data.actor} />
        </CardContent>
      </Card>

      {CONFIG_AREAS.map((area) => {
        const probes = probesForArea(data.probes, area);
        if (probes.length === 0) return null;
        return (
          <Card key={area}>
            <CardHeader>
              <CardTitle className="text-base">{AREA_LABEL[area]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {probes.map((probe) => (
                <div key={probe.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {statusIcon(probe.status)}
                      <div>
                        <p className="text-sm font-medium">{probe.label}</p>
                        <p className="text-sm text-muted-foreground">{probe.observed}</p>
                        {probe.action ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Action: </span>
                            {probe.action}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {statusBadge(probe.status)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capacity assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.capacity.map((fact) => (
            <div key={fact.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">
                {fact.label}: {fact.value}
              </p>
              <p className="text-muted-foreground">{fact.bound}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <RecoveryStatusCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Infrastructure limitations and mitigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.limitations.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{item.limitation}</p>
                <Badge variant={item.impact === "High" ? "destructive" : "secondary"}>
                  {item.impact}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium text-foreground">Mitigation: </span>
                {item.mitigation}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incident ownership and support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.contacts.map((contact) => (
            <div key={contact.role} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">
                {contact.role} — {contact.owner}
              </p>
              <p className="text-muted-foreground">{contact.channel}</p>
              <p className="text-muted-foreground">{contact.scope}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}

/**
 * Recovery status: the last restore rehearsal, how long it took, who owns it,
 * and what the rehearsal could not prove. Reads the transcribed drill record so
 * the page works without server access.
 */
function RecoveryStatusCard() {
  const drill = RECOVERY_DRILL;
  const age = drillAgeDays(drill);
  const stale = age > DRILL_MAX_AGE_DAYS;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <CardTitle className="text-base">Recovery status — last restore rehearsal</CardTitle>
        {statusBadge(drillProbeStatus(drill))}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{drillSummary(drill)}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Restore time</dt>
            <dd className="font-medium">
              {drill.restoreSeconds}s to a verified schema · {drill.migrations} migrations replayed
            </dd>
          </div>
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Rehearsed {age === 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`}
            </dt>
            <dd className="font-medium">
              {stale
                ? `Older than the ${DRILL_MAX_AGE_DAYS}-day evidence window`
                : "Inside the evidence window"}
            </dd>
          </div>
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Drill owner</dt>
            <dd className="font-medium">{drill.owner}</dd>
          </div>
          <div className="rounded-md border border-border p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Real restore executed by
            </dt>
            <dd className="font-medium">{drill.restoreExecutedBy}</dd>
          </div>
        </dl>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Environment: </span>
          {drill.environment}
        </p>
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Method: </span>
          {drill.method}
        </p>
        <ul className="space-y-1">
          {drill.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2">
              {step.status === "pass" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
              )}
              <span>
                <span className="font-medium">{step.label}</span>{" "}
                <span className="text-muted-foreground">
                  — {step.seconds}s — {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {drill.baselineGaps.length > 0 && (
          <Alert>
            <AlertTitle>What this rehearsal could not prove</AlertTitle>
            <AlertDescription>
              {drill.baselineGaps.length} object(s) exist only inside the managed snapshot, so the
              migration set alone does not rebuild the database: {drill.baselineGaps.join(", ")}. A
              real recovery therefore depends on a platform restore. Reproduce the rehearsal with{" "}
              <code>{drill.reproduceWith}</code>; machine evidence is checked in at{" "}
              <code>{drill.evidencePath}</code>.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
