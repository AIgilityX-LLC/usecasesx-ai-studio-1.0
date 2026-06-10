import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, ExternalLink, Sparkles, ShieldAlert, FileQuestion } from "lucide-react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { createBoardUseCase, listSavedCatalogUseCases, addSavedUseCaseToBoard } from "@/lib/boards";
import { loadBoardWithItems } from "@/lib/boards.functions";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/boards/$boardId")({
  head: () => ({
    meta: [
      { title: "Use Case Board — UseCasesX™" },
      { name: "description", content: "View and manage AI use cases on this board." },
    ],
  }),
  component: BoardDetailPage,
});

function BoardDetailPage() {
  const { boardId } = Route.useParams();
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const loadBoard = useServerFn(loadBoardWithItems);

  useEffect(() => {
    if (session === null) navigate({ to: "/pro", replace: true });
  }, [session, navigate]);

  const board = useQuery({
    queryKey: ["board", boardId, "full"],
    queryFn: () => loadBoard({ data: { boardId } }),
    enabled: !!session?.user.id,
    retry: (count, err: any) => {
      const code = err?.statusCode ?? err?.cause?.statusCode;
      if (code === 403 || code === 404) return false;
      return count < 1;
    },
  });

  if (session === undefined || board.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading board…
      </div>
    );
  }

  if (board.error || !board.data) {
    const err: any = board.error;
    const kind: "forbidden" | "not_found" | "error" =
      err?.kind ?? err?.cause?.kind ??
      (err?.statusCode === 403 ? "forbidden" : err?.statusCode === 404 ? "not_found" : "error");
    const Icon = kind === "forbidden" ? ShieldAlert : kind === "not_found" ? FileQuestion : ShieldAlert;
    const heading =
      kind === "forbidden" ? "Access denied"
      : kind === "not_found" ? "Board not found"
      : "Couldn't load this board";
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <Icon className="mx-auto h-10 w-10 text-muted-foreground/70" />
        <h2 className="mt-4 text-xl font-bold text-foreground">{heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {err?.message ?? "An unexpected error prevented this board from loading."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => board.refetch()}>Try again</Button>
          <Button asChild>
            <Link to="/boards">← All boards</Link>
          </Button>
        </div>
      </div>
    );
  }

  const b = board.data.board;
  const list = board.data.items;

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1280px] px-6 py-12 space-y-8">
        <div>
          <Link
            to="/boards"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3 w-3" /> All Boards
          </Link>
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {b.board_type ?? "Studio"} · {b.status}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {b.title}
            </h1>
            {b.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{b.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <AddSavedDialog userId={session!.user.id} boardId={boardId} />
            <AddItemDialog userId={session!.user.id} boardId={boardId} />
          </div>
        </header>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-4 text-lg font-semibold text-foreground">No use cases on this board</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a use case manually below, or use “+ Add to Studio Board” on any catalog card.
            </p>
            <div className="mt-6 inline-flex gap-2">
              <AddSavedDialog userId={session!.user.id} boardId={boardId} />
              <AddItemDialog userId={session!.user.id} boardId={boardId} />
              <Button asChild variant="outline">
                <Link to="/repository">Browse catalog</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((uc) => (
              <Link
                key={uc.id}
                to="/studio/use-case/$id"
                params={{ id: uc.id }}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {uc.status}
                  </span>
                  {uc.ai_type && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      {uc.ai_type}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary">
                  {uc.title}
                </h3>
                {uc.problem_statement && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {uc.problem_statement}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  Open in Studio <ExternalLink className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AddItemDialog({ userId, boardId }: { userId: string; boardId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");

  const add = useMutation({
    mutationFn: () => createBoardUseCase({ userId, boardId, title, problem }),
    onSuccess: ({ id }) => {
      toast.success("Use case added to board.");
      qc.invalidateQueries({ queryKey: ["board", boardId, "full"] });
      qc.invalidateQueries({ queryKey: ["boards", "list"] });
      setOpen(false);
      setTitle("");
      setProblem("");
      navigate({ to: "/studio/use-case/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Use Case
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a use case to this board</DialogTitle>
          <DialogDescription>Start with a title; you can build the rest in Studio.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uc-title">Title</Label>
            <Input
              id="uc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clinical Triage Copilot"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uc-problem">Business problem (optional)</Label>
            <Textarea
              id="uc-problem"
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What problem is this use case solving?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={add.isPending}>
            Cancel
          </Button>
          <Button onClick={() => add.mutate()} disabled={add.isPending || !title.trim()}>
            {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add &amp; Open Studio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSavedDialog({ userId, boardId }: { userId: string; boardId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const saved = useQuery({
    queryKey: ["saved-catalog", userId],
    queryFn: () => listSavedCatalogUseCases(userId),
    enabled: open,
  });

  const add = useMutation({
    mutationFn: (catalogUseCaseId: string) =>
      addSavedUseCaseToBoard({ userId, boardId, catalogUseCaseId }),
    onSuccess: () => {
      toast.success("Saved use case added to board.");
      qc.invalidateQueries({ queryKey: ["board", boardId, "full"] });
      qc.invalidateQueries({ queryKey: ["boards", "list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Bookmark className="h-4 w-4" /> Add from Saved
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a saved use case to this board</DialogTitle>
          <DialogDescription>
            Import one of your saved catalog use cases as a starting point on this board.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {saved.isLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading saved use cases…
            </div>
          )}
          {saved.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {(saved.error as Error).message}
            </div>
          )}
          {saved.data && saved.data.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              You haven't saved any use cases yet.{" "}
              <Link to="/repository" className="font-semibold text-primary hover:underline">
                Browse the catalog
              </Link>
              .
            </div>
          )}
          {saved.data?.map((s) => (
            <div
              key={s.saved_id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{s.title}</div>
                {s.summary && (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.summary}</div>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => add.mutate(s.use_case_id)}
                disabled={add.isPending}
              >
                {add.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                Add
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
