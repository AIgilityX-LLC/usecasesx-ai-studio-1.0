import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as adminRepo from "@/lib/domain/admin.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { RequireRoles } from "@/components/RequireRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  type Submission,
  type SubmissionStatus,
  SUBMISSION_STATUSES,
  statusBadgeClass,
  statusLabel,
} from "@/lib/submissions";

export const Route = createFileRoute("/_app/admin-submissions")({
  head: () => ({
    meta: [
      { title: "Submission Review — UseCasesX™ Admin" },
      { name: "robots", content: "noindex" },
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
      action="review use-case submissions"
    >
      <AdminSubmissions />
    </RequireRoles>
  ),
});

function AdminSubmissions() {
  const session = useSupabaseSession();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [active, setActive] = useState<Submission | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminRepo.listSubmissions<Submission>());
    } catch (e) {
      toast.error(toUserMessage(e, "We could not load submissions."));
      setRows([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const review = async (s: Submission, next: SubmissionStatus) => {
    try {
      await adminRepo.reviewSubmission({
        id: s.id,
        status: next,
        reviewNotes: notes || s.review_notes,
      });
    } catch (e) {
      toast.error(toUserMessage(e, "We could not update this submission."));
      return;
    }
    setRows((prev) =>
      prev.map((x) =>
        x.id === s.id ? { ...x, status: next, review_notes: notes || x.review_notes } : x,
      ),
    );
    toast.success(`Marked ${statusLabel(next)}`);
    setActive(null);
    setNotes("");
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (q) {
          const t = q.toLowerCase();
          if (
            !r.title.toLowerCase().includes(t) &&
            !(r.industry ?? "").toLowerCase().includes(t) &&
            !r.tags.join(" ").toLowerCase().includes(t)
          )
            return false;
        }
        return true;
      }),
    [rows, status, q],
  );

  const stats = useMemo(
    () => ({
      submitted: rows.filter((r) => r.status === "submitted").length,
      inReview: rows.filter((r) => r.status === "in_review").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows],
  );

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Submission Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, approve, or reject community use-case submissions.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Submitted", value: stats.submitted },
            { label: "In review", value: stats.inReview },
            { label: "Approved", value: stats.approved },
            { label: "Rejected", value: stats.rejected },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, domain, tags…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {SUBMISSION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading submissions…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No submissions match.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.title}</p>
                      <Badge variant="secondary" className={statusBadgeClass(s.status)}>
                        {statusLabel(s.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {s.summary ?? s.business_problem ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[s.industry, s.sector].filter(Boolean).join(" · ")}
                      {s.tags.length ? ` · ${s.tags.join(", ")}` : ""}
                    </p>
                  </div>
                  <Dialog
                    open={active?.id === s.id}
                    onOpenChange={(o) => {
                      setActive(o ? s : null);
                      setNotes(o ? (s.review_notes ?? "") : "");
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Eye className="mr-1 h-4 w-4" /> Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{s.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-sm">
                        <Field label="Summary" value={s.summary} />
                        <Field label="Business problem" value={s.business_problem} />
                        <Field label="AI solution" value={s.ai_solution} />
                        <Field
                          label="Industry / Sector"
                          value={[s.industry, s.sector].filter(Boolean).join(" · ")}
                        />
                        <Field label="Tags" value={s.tags.join(", ")} />
                        <Field label="Sources" value={s.sources.join(", ")} />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Reviewer notes
                          </p>
                          <Textarea
                            className="mt-1"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional feedback to the submitter…"
                          />
                        </div>
                      </div>
                      <DialogFooter className="flex-wrap gap-2">
                        <Button variant="outline" onClick={() => review(s, "in_review")}>
                          <Clock className="mr-1 h-4 w-4" /> In review
                        </Button>
                        <Button
                          variant="outline"
                          className="text-destructive"
                          onClick={() => review(s, "rejected")}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                        <Button onClick={() => review(s, "approved")}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  );
}
