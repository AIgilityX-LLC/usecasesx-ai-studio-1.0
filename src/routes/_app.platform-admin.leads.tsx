import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Search, Users, MailCheck, Trophy, History, RefreshCw, Send } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import {
  getLeadPipeline,
  getLeadTimeline,
  retryLeadConfirmations,
  setLeadPipelineStatus,
} from "@/lib/leads/leads.functions";
import { resendLeadConfirmation } from "@/lib/leads/email-admin.functions";
import {
  DEFAULT_CSV_OPTIONS,
  LEAD_STATUSES,
  campaignLabel,
  conversionCounts,
  dedupeByEmail,
  filterLeads,
  leadChannel,
  leadsToCsv,
  normalizeDeliveryStatus,
  normalizeLeadStatus,
  type CsvExportOptions,
  type DeliveryStatus,
  type LeadChannel,
  type LeadEvent,
  type LeadRecord,
  type LeadStatus,
} from "@/lib/leads/leads.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/platform-admin/leads")({
  head: () => privateHead("Lead pipeline & conversions"),
  component: LeadsRoute,
});

function LeadsRoute() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="review the lead pipeline">
      <LeadsDashboard />
    </RequireRoles>
  );
}

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  contacted: "bg-primary/15 text-primary",
  converted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const DELIVERY_TONE: Record<DeliveryStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  sent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-destructive/15 text-destructive",
  suppressed: "bg-muted text-muted-foreground",
  skipped: "bg-muted text-muted-foreground",
};

function LeadsDashboard() {
  const load = useServerFn(getLeadPipeline);
  const update = useServerFn(setLeadPipelineStatus);
  const retry = useServerFn(retryLeadConfirmations);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<LeadChannel | "all">("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [campaign, setCampaign] = useState<string>("all");
  const [dedupe, setDedupe] = useState(true);
  const [csvOptions, setCsvOptions] = useState<CsvExportOptions>(DEFAULT_CSV_OPTIONS);
  const [timelineLead, setTimelineLead] = useState<LeadRecord | null>(null);
  const [resendLead, setResendLead] = useState<LeadRecord | null>(null);

  const leads = useQuery({
    queryKey: ["lead-pipeline"],
    queryFn: () => load({ data: undefined }) as Promise<LeadRecord[]>,
  });

  const rows = leads.data ?? [];

  const campaigns = useMemo(() => Array.from(new Set(rows.map(campaignLabel))).sort(), [rows]);

  const visible = useMemo(() => {
    const filtered = filterLeads(rows, { query, channel, status, campaign });
    return dedupe
      ? dedupeByEmail(filtered)
      : filtered.map((l) => ({ ...l, submissions: 1, duplicateIds: [] as string[] }));
  }, [rows, query, channel, status, campaign, dedupe]);

  const counts = useMemo(() => conversionCounts(rows), [rows]);

  const mutate = useMutation({
    mutationFn: (input: { ids: string[]; status: LeadStatus }) => update({ data: input }),
    onSuccess: (_r, input) => {
      toast.success(`Marked ${input.ids.length} lead(s) as ${input.status}`);
      void queryClient.invalidateQueries({ queryKey: ["lead-pipeline"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "We could not update that lead."),
  });

  const retryMutation = useMutation({
    mutationFn: () => retry({ data: undefined }),
    onSuccess: (result) => {
      if (result.attempted === 0) toast.info("No confirmation emails are due for retry.");
      else
        toast.success(
          `Retried ${result.attempted} confirmation email(s): ${result.sent} sent, ${result.failed} still failing.`,
        );
      void queryClient.invalidateQueries({ queryKey: ["lead-pipeline"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The retry pass could not run."),
  });

  const exportCsv = () => {
    const csv = leadsToCsv(visible, csvOptions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usecasex-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${visible.length} lead(s)`);
  };

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Lead pipeline</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Waitlist and advisor leads with campaign attribution, deduped by work email.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              {retryMutation.isPending ? "Retrying…" : "Retry due emails"}
            </Button>
            <Button onClick={exportCsv} disabled={visible.length === 0} variant="outline">
              <Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV
            </Button>
          </div>
        </header>

        <fieldset className="flex flex-wrap items-center gap-4 rounded-xl border border-border px-4 py-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            CSV columns
          </legend>
          {(
            [
              ["reference", "Reference IDs"],
              ["attribution", "Attribution (UTM, referrer)"],
              ["campaignBreakdown", "Campaign breakdown"],
              ["delivery", "Email delivery status"],
            ] as [keyof CsvExportOptions, string][]
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`csv-${key}`}
                checked={Boolean(csvOptions[key])}
                onCheckedChange={(checked) =>
                  setCsvOptions((prev) => ({ ...prev, [key]: checked === true }))
                }
              />
              <Label htmlFor={`csv-${key}`} className="text-sm">
                {label}
              </Label>
            </div>
          ))}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" aria-hidden />}
            label="Submissions"
            value={counts.total}
            hint={`${counts.uniqueEmails} unique work emails`}
          />
          <StatCard
            icon={<MailCheck className="h-4 w-4" aria-hidden />}
            label="Waitlist / advisor"
            value={`${counts.byChannel.waitlist} / ${counts.byChannel.advisor}`}
            hint={`${counts.byChannel.other} other sources`}
          />
          <StatCard
            icon={<Trophy className="h-4 w-4" aria-hidden />}
            label="Converted"
            value={counts.byStatus.converted}
            hint={`${(counts.conversionRate * 100).toFixed(1)}% of submissions`}
          />
          <StatCard
            label="New / contacted"
            value={`${counts.byStatus.new} / ${counts.byStatus.contacted}`}
            hint="Awaiting first reply / in conversation"
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Conversions by campaign</CardTitle>
          </CardHeader>
          <CardContent>
            {counts.byCampaign.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads captured yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {counts.byCampaign.slice(0, 8).map((row) => (
                  <li key={row.campaign} className="flex items-center justify-between py-2">
                    <span className="font-medium">{row.campaign}</span>
                    <span className="text-muted-foreground">
                      {row.leads} lead{row.leads === 1 ? "" : "s"} · {row.converted} converted
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Search leads"
              placeholder="Search name, email, company, reference…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={channel} onValueChange={(v) => setChannel(v as LeadChannel | "all")}>
            <SelectTrigger className="w-[160px]" aria-label="Channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="waitlist">Waitlist</SelectItem>
              <SelectItem value="advisor">Advisor</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus | "all")}>
            <SelectTrigger className="w-[160px]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={campaign} onValueChange={setCampaign}>
            <SelectTrigger className="w-[180px]" aria-label="Campaign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="dedupe" checked={dedupe} onCheckedChange={setDedupe} />
            <Label htmlFor="dedupe" className="text-sm">
              Dedupe by email
            </Label>
          </div>
        </div>

        {leads.isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading leads…</p>
        ) : leads.isError ? (
          <p className="py-16 text-center text-sm text-destructive">
            We could not load the lead pipeline.
          </p>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No leads match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Captured waitlist and advisor leads</caption>
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Lead
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Channel
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Campaign
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Confirmation email
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((lead) => {
                  const current = normalizeLeadStatus(lead.lead_status);
                  const submissions = lead.submissions;
                  const delivery = normalizeDeliveryStatus(lead.confirmation_status);
                  return (
                    <tr key={lead.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.full_name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {lead.company ?? "—"} · {new Date(lead.created_at).toLocaleDateString()}
                          {submissions > 1 ? ` · ${submissions} submissions` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{lead.reference_id ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{leadChannel(lead.cta)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {campaignLabel(lead)}
                        {lead.utm_medium ? ` · ${lead.utm_medium}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={STATUS_TONE[current]}>
                          {current}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={DELIVERY_TONE[delivery]}>
                          {delivery}
                        </Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {lead.confirmation_attempts ?? 0} attempt
                          {(lead.confirmation_attempts ?? 0) === 1 ? "" : "s"}
                        </div>
                        {lead.confirmation_last_error ? (
                          <div className="mt-1 max-w-[220px] break-words text-xs text-destructive">
                            {lead.confirmation_last_error}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {LEAD_STATUSES.filter((s) => s !== current).map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs capitalize"
                              disabled={mutate.isPending}
                              onClick={() =>
                                mutate.mutate({
                                  ids: [lead.id, ...(lead.duplicateIds ?? [])],
                                  status: s,
                                })
                              }
                            >
                              {s}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setResendLead(lead)}
                          >
                            <Send className="mr-1 h-3 w-3" aria-hidden /> Resend
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setTimelineLead(lead)}
                          >
                            <History className="mr-1 h-3 w-3" aria-hidden /> Timeline
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <LeadTimelineDialog lead={timelineLead} onClose={() => setTimelineLead(null)} />
        <ResendConfirmationDialog
          lead={resendLead}
          onClose={() => setResendLead(null)}
          onSent={() => void queryClient.invalidateQueries({ queryKey: ["lead-pipeline"] })}
        />
      </div>
    </section>
  );
}

/** Append-only audit timeline for one lead: who changed what, and when. */
function LeadTimelineDialog({ lead, onClose }: { lead: LeadRecord | null; onClose: () => void }) {
  const loadTimeline = useServerFn(getLeadTimeline);
  const timeline = useQuery({
    queryKey: ["lead-timeline", lead?.id],
    enabled: Boolean(lead),
    queryFn: () => loadTimeline({ data: { leadId: lead!.id } }) as Promise<LeadEvent[]>,
  });

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lead activity</DialogTitle>
          <DialogDescription>
            {lead ? `${lead.full_name} · ${lead.reference_id ?? "no reference"}` : ""}
          </DialogDescription>
        </DialogHeader>
        {timeline.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading activity…</p>
        ) : timeline.isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            We could not load this lead&apos;s activity.
          </p>
        ) : (timeline.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No status changes or email attempts recorded yet.
          </p>
        ) : (
          <ol className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {(timeline.data ?? []).map((event) => (
              <li key={event.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">
                    {event.event_type.replace(/_/g, " ")}
                    {event.from_status || event.to_status
                      ? `: ${event.from_status ?? "—"} → ${event.to_status ?? "—"}`
                      : ""}
                  </span>
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </time>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  by {event.actor_label ?? "system"}
                </div>
                {event.detail ? <p className="mt-1 text-xs">{event.detail}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** On-demand resend of one lead's confirmation email, with an audit note. */
function ResendConfirmationDialog({
  lead,
  onClose,
  onSent,
}: {
  lead: LeadRecord | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const resend = useServerFn(resendLeadConfirmation);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => resend({ data: { leadId: lead!.id, note: note.trim() || null } }),
    onSuccess: (result) => {
      if (result.sent) toast.success("Confirmation email sent again.");
      else if (result.reason === "recipient_suppressed")
        toast.warning("This address is suppressed (bounced, spam report or opt-out) — not sent.");
      else toast.warning(`Attempt recorded but not delivered: ${result.reason ?? "unknown"}`);
      onSent();
      setNote("");
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The resend attempt failed."),
  });

  return (
    <Dialog open={Boolean(lead)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resend confirmation</DialogTitle>
          <DialogDescription>
            {lead
              ? `${lead.full_name} · ${lead.email} · ${lead.reference_id ?? "no reference"}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resend-note">Note (optional)</Label>
          <Textarea
            id="resend-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are you resending? Recorded on the lead timeline."
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !lead}>
            <Send className="mr-2 h-4 w-4" aria-hidden />
            {mutation.isPending ? "Sending…" : "Send now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
