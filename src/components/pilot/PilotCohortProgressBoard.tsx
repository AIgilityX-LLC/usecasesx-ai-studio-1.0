import { Link } from "@tanstack/react-router";

import {
  MILESTONE_STATUS_LABEL,
  PILOT_MILESTONES,
  type PilotMilestoneStatus,
} from "@/lib/pilot/pilot.milestones";
import {
  buildMemberProgress,
  sortByNeedsAttention,
  summarizeCohortProgress,
  type CohortMemberInput,
} from "@/lib/pilot/pilot.tracking";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STEP_STYLE: Record<PilotMilestoneStatus, string> = {
  locked: "border-border bg-muted",
  ready: "border-primary bg-background",
  submitted: "border-accent-foreground bg-accent",
  changes_requested: "border-destructive bg-destructive/20",
  approved: "border-primary bg-primary",
};

const SHORT_LABEL: Record<string, string> = {
  onboarding: "Intake",
  first_use_case: "Use case",
  scored: "Scored",
  portfolio: "Portfolio",
  roadmap: "Roadmap",
  checkpoint: "Checkpoint",
};

function StepDot({ status, label }: { status: PilotMilestoneStatus; label: string }) {
  const text = `${label}: ${MILESTONE_STATUS_LABEL[status]}`;
  return (
    <span
      className={`inline-block h-4 w-4 rounded-full border-2 ${STEP_STYLE[status]}`}
      title={text}
      aria-label={text}
      role="img"
    />
  );
}

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

export function PilotCohortProgressBoard({ members }: { members: CohortMemberInput[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No cohort members yet"
        description="When you approve an application, that person gets a seat and their progress through the six pilot steps shows here."
        action={
          <Button asChild variant="outline">
            <Link to="/platform-admin/pilot">Review applications</Link>
          </Button>
        }
      />
    );
  }

  const rows = sortByNeedsAttention(members.map(buildMemberProgress));
  const s = summarizeCohortProgress(rows);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Seats" value={s.seats} hint={`${s.notJoined} not joined yet`} />
        <Stat label="Joined" value={s.joined} />
        <Stat
          label="Average progress"
          value={s.averagePercent === null ? "—" : `${s.averagePercent}%`}
          hint={`${s.finished} finished every step`}
        />
        <Stat label="Awaiting your approval" value={s.awaitingApproval} hint="Submitted steps" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Where the cohort is</CardTitle>
          <CardDescription>
            Joined members who have done each step, and how many you have approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.funnel.map((step, i) => (
              <li key={step.key} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {i + 1}. {step.label}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {step.reached}/{s.joined}
                  </span>
                </div>
                <Progress
                  value={s.joined === 0 ? 0 : (step.reached / s.joined) * 100}
                  aria-label={`${step.label}: ${step.reached} of ${s.joined} members`}
                />
                <p className="text-xs text-muted-foreground">{step.approved} approved</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Each member</CardTitle>
            <CardDescription>
              People with steps waiting for you come first, then the least progressed.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/platform-admin/pilot-milestones">Approve steps</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(Object.keys(STEP_STYLE) as PilotMilestoneStatus[]).map((st) => (
              <span key={st} className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded-full border-2 ${STEP_STYLE[st]}`} />
                {MILESTONE_STATUS_LABEL[st]}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Member</th>
                  {PILOT_MILESTONES.map((m) => (
                    <th key={m.key} className="px-1 py-2 text-center font-medium">
                      {SHORT_LABEL[m.key]}
                    </th>
                  ))}
                  <th className="py-2 pl-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.invitationId} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-foreground">{m.fullName ?? m.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {[m.organization, m.sector, m.roleTitle].filter(Boolean).join(" · ") ||
                          m.email}
                      </div>
                    </td>
                    {m.steps.map((step) => (
                      <td key={step.key} className="px-1 py-2 text-center">
                        <StepDot status={step.status} label={SHORT_LABEL[step.key] ?? step.key} />
                      </td>
                    ))}
                    <td className="py-2 pl-3">
                      {m.joined ? (
                        <div className="flex items-center gap-2">
                          <Progress value={m.percent} className="h-2 w-20" aria-hidden />
                          <span className="tabular-nums text-muted-foreground">{m.percent}%</span>
                          {m.awaitingApproval > 0 ? (
                            <Badge variant="default">{m.awaitingApproval} to approve</Badge>
                          ) : null}
                        </div>
                      ) : (
                        <Badge variant="secondary">Invited — not joined</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
