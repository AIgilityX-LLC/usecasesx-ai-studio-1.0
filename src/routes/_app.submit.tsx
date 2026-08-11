import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Send, Save, Trash2, Plus } from "lucide-react";
import {
  type Submission,
  SubmissionInput,
  statusBadgeClass,
  statusLabel,
  parseList,
} from "@/lib/submissions";
import {
  listMySubmissions,
  saveSubmission,
  submitDraft as submitDraftFn,
  deleteDraft,
} from "@/lib/submissions.functions";

export const Route = createFileRoute("/_app/submit")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Submit an AI Use Case — UseCasesX™" },
      {
        name: "description",
        content:
          "Contribute a new AI use case with tags and sources for admin review and approval.",
      },
    ],
  }),
  component: SubmitPage,
});

const EMPTY = {
  title: "",
  summary: "",
  business_problem: "",
  ai_solution: "",
  industry: "",
  sector: "",
  tags: "",
  sources: "",
};

function SubmitPage() {
  const session = useSupabaseSession();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchMine = useServerFn(listMySubmissions);
  const save = useServerFn(saveSubmission);
  const promoteDraft = useServerFn(submitDraftFn);
  const removeDraft = useServerFn(deleteDraft);

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  };

  const load = async () => {
    try {
      setMine((await fetchMine()) as unknown as Submission[]);
    } catch {
      toast.error("We could not load your submissions.");
      setMine([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    if (session) load();
    else if (session === null) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const submit = async (status: "draft" | "submitted") => {
    if (!session) {
      toast.error("Please sign in to submit.");
      return;
    }
    const candidate = {
      title: form.title,
      summary: form.summary,
      businessProblem: form.business_problem,
      aiSolution: form.ai_solution,
      industry: form.industry || undefined,
      sector: form.sector || undefined,
      tags: parseList(form.tags),
      sources: parseList(form.sources),
      status,
    };
    // Drafts are intentionally lenient: only the title is enforced.
    const parsed =
      status === "draft"
        ? SubmissionInput.pick({ title: true }).safeParse(candidate)
        : SubmissionInput.safeParse(candidate);
    if (!parsed.success) {
      const fieldMap: Record<string, keyof typeof EMPTY> = {
        title: "title",
        summary: "summary",
        businessProblem: "business_problem",
        aiSolution: "ai_solution",
        industry: "industry",
        sector: "sector",
      };
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = fieldMap[String(issue.path[0])] ?? String(issue.path[0]);
        next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      await save({ data: { ...candidate, status } });
      toast.success(
        status === "draft" ? "Draft saved" : "Submitted for review — a reviewer will respond.",
      );
      setForm({ ...EMPTY });
      setErrors({});
      await load();
    } catch (e) {
      toast.error("Failed: " + (e instanceof Error ? e.message : "unknown error"));
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    try {
      await removeDraft({ data: { id } });
    } catch (e) {
      toast.error("Delete failed: " + (e instanceof Error ? e.message : "unknown error"));
      return;
    }
    setMine((prev) => prev.filter((s) => s.id !== id));
    toast.success("Draft deleted");
  };

  const sendDraft = async (s: Submission) => {
    try {
      await promoteDraft({ data: { id: s.id } });
    } catch (e) {
      toast.error("Failed: " + (e instanceof Error ? e.message : "unknown error"));
      return;
    }
    setMine((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "submitted" } : x)));
    toast.success("Submitted for review");
  };

  if (session === null) {
    return (
      <>
        <PageHero
          tone="dark"
          eyebrow="Contribute"
          title="Submit an AI use case"
          description="Sign in to contribute use cases to the repository."
        />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
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
            <CardHeader>
              <CardTitle>New submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={200}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "title-error" : undefined}
                  placeholder="e.g. Automated benefits eligibility triage"
                />
                <FieldError id="title-error" message={errors.title} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="summary">Summary *</Label>
                <Textarea
                  id="summary"
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  rows={3}
                  maxLength={1000}
                  aria-invalid={!!errors.summary}
                />
                <FieldError id="summary-error" message={errors.summary} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry / Domain</Label>
                  <Input
                    id="industry"
                    value={form.industry}
                    onChange={(e) => set("industry", e.target.value)}
                    placeholder="e.g. Public Sector"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sector">Sector</Label>
                  <Input
                    id="sector"
                    value={form.sector}
                    onChange={(e) => set("sector", e.target.value)}
                    placeholder="e.g. Social Services"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="problem">Business problem *</Label>
                <Textarea
                  id="problem"
                  value={form.business_problem}
                  onChange={(e) => set("business_problem", e.target.value)}
                  rows={3}
                  maxLength={4000}
                  aria-invalid={!!errors.business_problem}
                />
                <FieldError id="problem-error" message={errors.business_problem} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="solution">AI solution *</Label>
                <Textarea
                  id="solution"
                  value={form.ai_solution}
                  onChange={(e) => set("ai_solution", e.target.value)}
                  rows={3}
                  maxLength={4000}
                  aria-invalid={!!errors.ai_solution}
                />
                <FieldError id="solution-error" message={errors.ai_solution} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={form.tags}
                    onChange={(e) => set("tags", e.target.value)}
                    placeholder="nlp, automation, triage"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sources">Sources / references (comma separated)</Label>
                  <Input
                    id="sources"
                    value={form.sources}
                    onChange={(e) => set("sources", e.target.value)}
                    placeholder="https://…, report name"
                  />
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
              <p className="text-xs text-muted-foreground">
                Submitted use cases are reviewed before publication. Approved submissions are
                published to the repository with a community-contribution provenance label.
              </p>
            </CardContent>
          </Card>

          {/* My submissions */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Plus className="h-4 w-4" /> My submissions
            </h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : mine.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                No submissions yet.
              </p>
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
                            <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                              Reviewer: {s.review_notes}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className={statusBadgeClass(s.status)}>
                          {statusLabel(s.status)}
                        </Badge>
                      </div>
                      {s.status === "draft" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => sendDraft(s)}
                          >
                            <Send className="mr-1 h-3 w-3" /> Submit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive"
                              >
                                <Trash2 className="mr-1 h-3 w-3" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(s.id)}>
                                  Delete
                                </AlertDialogAction>
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
