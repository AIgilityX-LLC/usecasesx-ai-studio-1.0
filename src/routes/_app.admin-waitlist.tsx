import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireRoles } from "@/components/RequireRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDataTable, type Column } from "@/components/AdminDataTable";
import { Check, X, Clock, Search, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin-waitlist")({
  head: () => ({
    meta: [{ title: "Free Pro Waitlist — UseCasesX™ Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <RequireRoles
      anyOf={["admin", "moderator", "super_admin", "ai_hub_admin", "usecasex_admin", "content_manager", "reviewer"]}
      action="review the Free Pro waitlist"
    >
      <WaitlistAdmin />
    </RequireRoles>
  ),
});

type Lead = {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  cta: string | null;
  eligible: boolean | null;
  waitlist_status: string;
  created_at: string;
};

const STATUS_OPTIONS = ["pending", "eligible", "approved", "rejected"] as const;

function statusBadge(s: string) {
  switch (s) {
    case "approved": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "eligible": return "bg-primary/15 text-primary";
    case "rejected": return "bg-destructive/15 text-destructive";
    default: return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
}

function WaitlistAdmin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eligFilter, setEligFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_captures")
      .select("id, full_name, email, company, cta, eligible, waitlist_status, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load leads: " + error.message);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, waitlist_status: string) => {
    const { error } = await supabase.from("lead_captures").update({ waitlist_status }).eq("id", id);
    if (error) { toast.error("Update failed: " + error.message); return; }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, waitlist_status } : l)));
    toast.success(`Marked as ${waitlist_status}`);
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.waitlist_status !== statusFilter) return false;
      if (eligFilter === "eligible" && !l.eligible) return false;
      if (eligFilter === "not-eligible" && l.eligible) return false;
      if (q) {
        const t = q.toLowerCase();
        if (!l.full_name.toLowerCase().includes(t) && !l.email.toLowerCase().includes(t) && !(l.company ?? "").toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, eligFilter, q]);

  const stats = useMemo(() => ({
    total: leads.length,
    eligible: leads.filter((l) => l.eligible).length,
    pending: leads.filter((l) => l.waitlist_status === "pending").length,
    approved: leads.filter((l) => l.waitlist_status === "approved").length,
  }), [leads]);

  const columns: Column<Lead>[] = [
    { key: "name", header: "Name", render: (r) => (
      <div>
        <div className="font-medium">{r.full_name}</div>
        <div className="text-xs text-muted-foreground">{r.email}</div>
      </div>
    ) },
    { key: "company", header: "Company", render: (r) => <span className="text-muted-foreground">{r.company ?? "—"}</span> },
    { key: "eligible", header: "Eligibility", render: (r) => (
      r.eligible
        ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /> Eligible</span>
        : <span className="inline-flex items-center gap-1 text-muted-foreground"><ShieldX className="h-4 w-4" /> Not eligible</span>
    ) },
    { key: "status", header: "Status", render: (r) => (
      <Badge variant="secondary" className={statusBadge(r.waitlist_status)}>{r.waitlist_status}</Badge>
    ) },
    { key: "created", header: "Requested", render: (r) => (
      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
    ) },
    { key: "actions", header: "Actions", render: (r) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => updateStatus(r.id, "approved")} disabled={r.waitlist_status === "approved"}>
          <Check className="mr-1 h-3 w-3" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => updateStatus(r.id, "rejected")} disabled={r.waitlist_status === "rejected"}>
          <X className="mr-1 h-3 w-3" /> Reject
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => updateStatus(r.id, "pending")}>
          <Clock className="mr-1 h-3 w-3" /> Reset
        </Button>
      </div>
    ) },
  ];

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Free Pro Waitlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review founding-member and Free Pro leads, their eligibility, and approval status.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total leads", value: stats.total },
            { label: "Eligible", value: stats.eligible },
            { label: "Pending", value: stats.pending },
            { label: "Approved", value: stats.approved },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, email, company…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={eligFilter} onValueChange={setEligFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Eligibility" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All eligibility</SelectItem>
              <SelectItem value="eligible">Eligible only</SelectItem>
              <SelectItem value="not-eligible">Not eligible</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading waitlist…</div>
        ) : (
          <AdminDataTable
            rows={filtered}
            columns={columns}
            empty={<div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">No leads match your filters.</div>}
          />
        )}
      </div>
    </section>
  );
}
