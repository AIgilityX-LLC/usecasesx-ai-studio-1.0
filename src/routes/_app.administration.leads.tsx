import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Search, Users, MailCheck, Trophy } from "lucide-react";

import { privateHead } from "@/lib/seo";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { getLeadPipeline, setLeadPipelineStatus } from "@/lib/leads/leads.functions";
import {
  LEAD_STATUSES,
  campaignLabel,
  conversionCounts,
  dedupeByEmail,
  filterLeads,
  leadChannel,
  leadsToCsv,
  normalizeLeadStatus,
  type LeadChannel,
  type LeadRecord,
  type LeadStatus,
} from "@/lib/leads/leads.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/administration/leads")({
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

function LeadsDashboard() {
  const load = useServerFn(getLeadPipeline);
  const update = useServerFn(setLeadPipelineStatus);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<LeadChannel | "all">("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [campaign, setCampaign] = useState<string>("all");
  const [dedupe, setDedupe] = useState(true);

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

  const exportCsv = () => {
    const csv = leadsToCsv(visible);
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
          <Button onClick={exportCsv} disabled={visible.length === 0} variant="outline">
            <Download className="mr-2 h-4 w-4" aria-hidden /> Export CSV
          </Button>
        </header>

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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((lead) => {
                  const current = normalizeLeadStatus(lead.lead_status);
                  const submissions = lead.submissions;
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
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
