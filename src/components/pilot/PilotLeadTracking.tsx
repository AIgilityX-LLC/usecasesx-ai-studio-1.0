import { Link } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

import type { PilotApplication } from "@/lib/pilot/pilot.applications";
import { applicationStatusLabel } from "@/lib/pilot/pilot.applications";
import {
  buildLeadTracking,
  roleLevel,
  sectorLabel,
  type BreakdownRow,
} from "@/lib/pilot/pilot.tracking";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function BreakdownList({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Leads and how many were approved.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {rows.slice(0, 8).map((row) => (
            <li key={row.label} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{row.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {row.total} · {row.approved} approved
                </span>
              </div>
              <div
                className="relative h-2 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${row.label}: ${row.total} leads, ${row.approved} approved`}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
                  style={{ width: `${(row.total / max) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: `${(row.approved / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        {rows.length > 8 ? (
          <p className="mt-3 text-xs text-muted-foreground">+{rows.length - 8} more</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function PilotLeadTracking({
  applications,
  cohort,
}: {
  applications: PilotApplication[];
  cohort: string | null;
}) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No pilot applications yet"
        description="Leads from the home page and the pilot application form appear here as soon as they arrive."
        action={
          <Button asChild variant="outline">
            <Link to="/pilot/apply">Open the application form</Link>
          </Button>
        }
      />
    );
  }

  const t = buildLeadTracking(applications);
  const maxWeek = Math.max(1, ...t.weekly.map((w) => w.total));
  const recent = applications.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Leads" value={t.total} hint={`${t.last30Days} in the last 30 days`} />
        <Stat label="Awaiting review" value={t.awaitingReview} />
        <Stat
          label="Approved"
          value={t.approved}
          hint={
            t.approvalRate === null
              ? "No decisions yet"
              : `${t.approvalRate}% of decided applications`
          }
        />
        <Stat label="This week" value={t.last7Days} hint="Leads in the last 7 days" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leads per week</CardTitle>
          <CardDescription>
            Last 8 weeks{cohort ? ` · cohort ${cohort}` : ""}. Darker part = approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-36 items-end gap-2">
            {t.weekly.map((w) => (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-muted-foreground">{w.total || ""}</span>
                <div
                  className="relative w-full overflow-hidden rounded-t-md bg-primary/25"
                  style={{ height: `${Math.max(4, (w.total / maxWeek) * 96)}px` }}
                  role="img"
                  aria-label={`Week of ${w.weekStart}: ${w.total} leads, ${w.approved} approved`}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-primary"
                    style={{ height: w.total ? `${(w.approved / w.total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {dateFmt.format(new Date(`${w.weekStart}T00:00:00Z`))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownList title="By sector" rows={t.bySector} />
        <BreakdownList title="By role" rows={t.byRole} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Latest leads</CardTitle>
            <CardDescription>The 10 most recent applications.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/platform-admin/pilot">
              <Inbox className="mr-1 h-4 w-4" aria-hidden /> Review queue
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Applicant</th>
                <th className="py-2 pr-3 font-medium">Sector</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-foreground">{a.fullName}</div>
                    <div className="text-xs text-muted-foreground">{a.organization}</div>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{sectorLabel(a.sector)}</td>
                  <td className="py-2 pr-3">
                    <div className="text-foreground">{a.roleTitle || "—"}</div>
                    <div className="text-xs text-muted-foreground">{roleLevel(a.roleTitle)}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant={a.status === "approved" ? "default" : "secondary"}>
                      {applicationStatusLabel(a.status)}
                    </Badge>
                  </td>
                  <td className="py-2 tabular-nums text-muted-foreground">
                    {dateFmt.format(new Date(a.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
