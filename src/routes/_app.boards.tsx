import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, FolderKanban, ExternalLink } from "lucide-react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { listBoards, createBoard, deleteBoard, type BoardRow } from "@/lib/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/boards")({
  head: () => ({
    meta: [
      { title: "Use Case Boards — UseCasesX™" },
      { name: "description", content: "Create, save, and open AI Use Case Boards for your team." },
    ],
  }),
  component: BoardsPage,
});

function BoardsPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const qc = useQueryClient();

  useEffect(() => {
    if (session === null) navigate({ to: "/pro", replace: true });
  }, [session, navigate]);

  const boards = useQuery({
    queryKey: ["boards", "list", session?.user.id ?? null],
    queryFn: listBoards,
    enabled: !!session?.user.id,
    staleTime: 30_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => {
      toast.success("Board deleted.");
      qc.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (session === undefined || boards.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading boards…
      </div>
    );
  }

  const items = boards.data ?? [];

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1280px] px-6 py-12 space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              UseCasesX™ · Boards
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Use Case Boards
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Group AI use cases into shared boards for portfolio reviews, quick-win sprints,
              and innovation backlogs. Every change is captured in your workspace audit trail.
            </p>
          </div>
          <CreateBoardDialog userId={session!.user.id} />
        </header>

        {boards.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(boards.error as Error).message}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-4 text-lg font-semibold text-foreground">No boards yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first board to start organizing AI use cases.
            </p>
            <div className="mt-6 inline-flex">
              <CreateBoardDialog userId={session!.user.id} variant="primary" />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <BoardCard key={b.id} board={b} onDelete={() => del.mutate(b.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BoardCard({ board, onDelete }: { board: BoardRow; onDelete: () => void }) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          {board.board_type ?? "Studio"}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {board.status}
        </span>
      </div>
      <Link
        to="/boards/$boardId"
        params={{ boardId: board.id }}
        className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary"
      >
        {board.title}
      </Link>
      {board.description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {board.description}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div>
          Use Cases
          <div className="mt-0.5 text-foreground">{board.item_count ?? 0}</div>
        </div>
        <div>
          Created
          <div className="mt-0.5 text-foreground">
            {new Date(board.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <Link
          to="/boards/$boardId"
          params={{ boardId: board.id }}
          className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          Open Board →
        </Link>
        <button
          onClick={() => {
            if (confirm(`Delete board "${board.title}"? This cannot be undone.`)) onDelete();
          }}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete board"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CreateBoardDialog({ userId, variant = "secondary" }: { userId: string; variant?: "primary" | "secondary" }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => createBoard({ userId, title, description }),
    onSuccess: (b) => {
      toast.success(`Board "${b.title}" created.`);
      qc.invalidateQueries({ queryKey: ["boards"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      navigate({ to: "/boards/$boardId", params: { boardId: b.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant === "primary" ? "default" : "default"} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new Use Case Board</DialogTitle>
          <DialogDescription>
            Boards group AI use cases for portfolio reviews and sprints.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-title">Board title</Label>
            <Input
              id="board-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 AI Opportunities"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-desc">Description (optional)</Label>
            <Textarea
              id="board-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this board track?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !title.trim()}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create &amp; Open <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
