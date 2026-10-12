/**
 * Production data audit — proves production holds only intended public content,
 * with private, pilot and demo data isolated from it. Every remediation here is
 * narrow, reversible and audited; nothing is deleted from this page.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, HelpCircle, Tags, XCircle } from "lucide-react";
import { toast } from "sonner";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  flagDemoTenantsFn,
  getProductionDataAuditFn,
  revokePlatformGrantFn,
  signOffProductionDataFn,
} from "@/lib/ops/ops.functions";
import {
  DATA_AREAS,
  DATA_AREA_LABEL,
  buildProductionDataChecklist,
  canSignOff,
  checksForArea,
  countDataStatus,
  dataVerdict,
  grantsNeedingReview,
  latestSignOff,
  productionDataCsv,
  type AdminGrantRow,
  type DataStatus,
} from "@/lib/ops/production-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/platform-admin/production-data")({
  head: () => privateHead("Production data audit"),
  component: () => (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="audit production data">
      <ProductionDataPage />
    </RequireRoles>
  ),
});

function statusBadge(status: DataStatus) {
  if (status === "pass") return <Badge variant="default">Pass</Badge>;
  if (status === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (status === "attention") return <Badge variant="secondary">Attention</Badge>;
  return <Badge variant="outline">Not measured</Badge>;
}

function statusIcon(status: DataStatus) {
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

const QUERY_KEY = ["production-data-audit"] as const;

function ProductionDataPage() {
  const fetchAudit = useServerFn(getProductionDataAuditFn);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAudit(),
  });

  const revoke = useServerFn(revokePlatformGrantFn);
  const flagDemo = useServerFn(flagDemoTenantsFn);
  const signOff = useServerFn(signOffProductionDataFn);
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const revokeGrant = useMutation({
    mutationFn: (input: { userId: string; role: string; reason: string }) =>
      revoke({ data: input }),
    onSuccess: (result) => {
      toast.success(result.revoked ? "Role revoked and audited." : "That grant no longer exists.");
      void refresh();
    },
    onError: (cause) =>
      toast.error("Could not revoke the role", {
        description: cause instanceof Error ? cause.message : "Try again.",
      }),
  });

  const flagTenants = useMutation({
    mutationFn: () => flagDemo(),
    onSuccess: (result) => {
      toast.success(
        `Flagged ${result.workspaces} workspace(s) and ${result.organizations} organization(s) across ${result.accounts} demo account(s).`,
      );
      void refresh();
    },
    onError: (cause) =>
      toast.error("Could not flag demo tenants", {
        description: cause instanceof Error ? cause.message : "Try again.",
      }),
  });

  const [note, setNote] = useState("");
  const record = useMutation({
    mutationFn: (verdict: "approved" | "rejected") => signOff({ data: { verdict, note } }),
    onSuccess: (result) => {
      toast.success(`Checklist ${result.verdict} and recorded.`);
      setNote("");
      void refresh();
    },
    onError: (cause) =>
      toast.error("Could not record the sign-off", {
        description: cause instanceof Error ? cause.message : "Try again.",
      }),
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
          <AlertTitle>Audit unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "The production data audit could not run."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const counts = countDataStatus(data.checks);
  const verdict = dataVerdict(data.checks);
  const stamp = data.generatedAt.slice(0, 10);
  const flagged = grantsNeedingReview(data.admins);
  const signed = latestSignOff(data.signOffs);
  const demoCheck = data.checks.find((check) => check.id === "demo.labelled");

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Production data audit</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Observed content and access for {data.release.version} (target {data.release.targetDate}).
          Nothing on this page deletes data — flagged records are reviewed by a named owner, and
          every remediation writes an audit event.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>
            {verdict === "clean"
              ? "Clean — production matches the intended surface"
              : verdict === "conditional"
                ? "Conditional — open items below"
                : "Blocked — failing checks below"}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                download(
                  `production-data-checklist-${stamp}.md`,
                  "text/markdown",
                  buildProductionDataChecklist(data),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Checklist
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                download(`production-data-${stamp}.csv`, "text/csv", productionDataCsv(data))
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
          <Fact label="Observed host" value={data.observedHost} />
          <Fact label="Release marker" value={data.release.marker} />
          <Fact label="Generated by" value={data.actor} />
          <Fact
            label="Last sign-off"
            value={
              signed ? `${signed.verdict} by ${signed.by} on ${signed.at.slice(0, 10)}` : "None yet"
            }
          />
        </CardContent>
      </Card>

      {DATA_AREAS.map((area) => {
        const checks = checksForArea(data.checks, area);
        if (checks.length === 0) return null;
        return (
          <Card key={area}>
            <CardHeader>
              <CardTitle className="text-base">{DATA_AREA_LABEL[area]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checks.map((check) => (
                <div key={check.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {statusIcon(check.status)}
                      <div>
                        <p className="text-sm font-medium">{check.label}</p>
                        <p className="text-sm text-muted-foreground">{check.observed}</p>
                        {check.action ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Action: </span>
                            {check.action}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {statusBadge(check.status)}
                  </div>
                </div>
              ))}
              {area === "demo_isolation" && demoCheck?.status !== "pass" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={flagTenants.isPending}
                  onClick={() => flagTenants.mutate()}
                >
                  <Tags className="mr-2 h-4 w-4" aria-hidden />
                  {flagTenants.isPending ? "Flagging…" : "Flag demo tenants"}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Platform role grants ({flagged.length} needing review of {data.admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No platform role grants exist.</p>
          ) : (
            data.admins.map((grant) => (
              <GrantRow
                key={`${grant.userId}:${grant.role}`}
                grant={grant}
                pending={revokeGrant.isPending}
                onRevoke={(reason) =>
                  revokeGrant.mutate({ userId: grant.userId, role: grant.role, reason })
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public content inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.inventory.map((row) => (
            <div key={row.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">
                {row.label}: {row.count}
              </p>
              <p className="text-muted-foreground">{row.expectation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anonymous read probes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.anonymousProbes.map((probe) => (
            <div
              key={probe.table}
              className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm"
            >
              <div>
                <p className="font-medium">{probe.table}</p>
                <p className="text-muted-foreground">{probe.detail}</p>
              </div>
              <Badge variant={probe.outcome === "sealed" ? "default" : "destructive"}>
                {probe.outcome === "sealed" ? "Sealed" : `Readable (${probe.rows})`}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign-off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canSignOff(data.checks) ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>Failing checks block approval</AlertTitle>
              <AlertDescription>
                Resolve the {counts.fail} failing check(s) above, then re-run the audit. A rejection
                can still be recorded to document the review.
              </AlertDescription>
            </Alert>
          ) : null}
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What you reviewed, and anything deliberately left in place."
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={record.isPending || !canSignOff(data.checks)}
              onClick={() => record.mutate("approved")}
            >
              Approve production data
            </Button>
            <Button
              variant="outline"
              disabled={record.isPending}
              onClick={() => record.mutate("rejected")}
            >
              Record rejection
            </Button>
          </div>
          {data.signOffs.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {data.signOffs.map((entry) => (
                <li key={`${entry.at}:${entry.by}`}>
                  {entry.at.slice(0, 16).replace("T", " ")} — {entry.verdict} by {entry.by}
                  {entry.note ? ` — ${entry.note}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No sign-off recorded yet.</p>
          )}
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
 * One grant. Revocation needs a written reason so the audit event explains
 * itself later; named holders are shown but not nudged for removal.
 */
function GrantRow({
  grant,
  pending,
  onRevoke,
}: {
  grant: AdminGrantRow;
  pending: boolean;
  onRevoke: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const needsReview = grant.kind !== "named";
  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {grant.displayName ?? "Unnamed account"} — {grant.role}
          </p>
          <p className="text-muted-foreground">
            {grant.email ?? "no email on profile"} · {grant.userId}
          </p>
        </div>
        <Badge variant={needsReview ? "destructive" : "outline"}>
          {grant.kind === "named" ? "Named owner" : grant.kind === "demo" ? "Demo" : "Unnamed"}
        </Badge>
      </div>
      {needsReview ? (
        <div className="flex flex-wrap gap-2">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for revoking this role"
            className="max-w-sm"
            aria-label={`Reason for revoking ${grant.role}`}
          />
          <Button
            variant="destructive"
            size="sm"
            disabled={pending || reason.trim().length < 3}
            onClick={() => onRevoke(reason.trim())}
          >
            Revoke role
          </Button>
        </div>
      ) : null}
    </div>
  );
}
