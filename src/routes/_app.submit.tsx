import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { PageHero } from "@/components/usecasex/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Send, Save, Trash2, Plus } from "lucide-react";
import {
  type Submission, type SubmissionStatus, statusBadgeClass, statusLabel, parseList,
} from "@/lib/submissions";

export const Route = createFileRoute("/_app/submit")({
  head: () => ({
    meta: [
      { title: "Submit an AI Use Case — UseCasesX™" },
      { name: "description", content: "Contribute a new AI use case with tags and sources for admin review and approval." },
    ],
  }),
  component: SubmitPage,
});

const EMPTY = {
  title: "", summary: "", business_problem: "", ai_solution: "",
  industry: "", sector: "", tags: "", sources: "",
};

function SubmitPage() {
  const session = useSupabaseSession();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    const { data } = await supabase
      .from("use_case_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    setMine((data as Submission[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (session) load(); else if (session === null) setLoading(false); }, [session]);

  const submit = async (status: SubmissionStatus) => {
    if (!session) { toast.error("Please sign in to submit."); return; }
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    const { error } = await supabase.from("use_case_submissions").insert({
      user_id: session.user.id,
      title: form.title.trim(),
      summary: form.summary || null,
      business_problem: form.business_problem || null,
      ai_solution: form.ai_solution || null,
      industry: form.industry || null,
      sector: form.sector || null,
      tags: parseList(form.tags),
      sources: parseList(form.sources),
      status,
    });
    setSaving(false);
    if (error) { toast.error("Failed: " + error.message); return; }
    toast.success(status === "draft" ? "Draft saved" : "Submitted for review");
    setForm({ ...EMPTY });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("use_case_submissions").delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    setMine((prev) => prev.filter((s) => s.id !== id));
    toast.success("Draft deleted");
  };

  const submitDraft = async (s: Submission) => {
    const { error } = await supabase.from("use_case_submissions").update({ status: "submitted" }).eq("id", s.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    setMine((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "submitted" } : x)));
    toast.success("Submitted for review");
  };

  if (session === null) {
    return (
      <>
        <PageHero tone="dark" eyebrow="Contribute" title="Submit an AI use case" description="Sign in to contribute use cases to the repository." />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <Button asChild><Link to="/auth">Sign in</Link></Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Contribute · Repository"
        title="Submit a new AI use case"
        description="Share a use case with tags and sources. Our reviewers move each submission through draft, review, and approval."
      />
      <section className="bg-background">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Form */}
          <Card>
            <CardHeader><CardTitle>New submission</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. Automated benefits eligibility triage" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={2} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry / Domain</Label>
                  <Input id="industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Public Sector" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sector">Sector</Label>
                  <Input id="sector" value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="e.g. Social Services" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="problem">Business problem</Label>
                <Textarea id="problem" value={form.business_problem} onChange={(e) => set("business_problem", e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="solution">AI solution</Label>
                <Textarea id="solution" value={form.ai_solution} onChange={(e) => set("ai_solution", e.target.value)} rows={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="nlp, automation, triage" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sources">Sources / references (comma separated)</Label>
                  <Input id="sources" value={form.sources} onChange={(e) => set("sources", e.target.value)} placeholder="https://…, report name" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => submit("submitted")} disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Submit for review
                </Button>
                <Button variant="outline" onClick={() => submit("draft")} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> Save as draft
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My submissions */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Plus className="h-4 w-4" /> My submissions</h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : mine.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-3">
                {mine.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()}
                            {s.tags.length ? ` · ${s.tags.slice(0, 3).join(", ")}` : ""}
                          </p>
                          {s.review_notes && (
                            <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">Reviewer: {s.review_notes}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className={statusBadgeClass(s.status)}>{statusLabel(s.status)}</Badge>
                      </div>
                      {s.status === "draft" && (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => submitDraft(s)}>
                            <Send className="mr-1 h-3 w-3" /> Submit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(s.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
