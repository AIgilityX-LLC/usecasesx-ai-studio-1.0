import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, FolderKanban, ExternalLink, Search, X } from "lucide-react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { listBoards, createBoard, deleteBoard, type BoardRow } from "@/lib/boards";
import { PageHero } from "@/components/usecasex/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Can } from "@/components/Can";

type SortKey = "updated_desc" | "updated_asc" | "created_desc" | "name_asc";
type UpdatedWindow = "all" | "7d" | "30d" | "90d";

const WINDOW_MS: Record<Exclude<UpdatedWindow, "all">, number> = {
  "7d": 7 * 864e5,
  "30d": 30 * 864e5,
  "90d": 90 * 864e5,
};

export const Route = createFileRoute("/_app/boards/")({
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

  if (!session) return null;

  const items = boards.data ?? [];

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="UseCasesX™ · Boards"
        title="Use Case Boards"
        description="Group AI use cases into shared boards for portfolio reviews, quick-win sprints, and innovation backlogs. Every change is captured in your workspace audit trail."
        actions={
          <Can action="boards.create">
            <CreateBoardDialog userId={session!.user.id} />
          </Can>
        }
      />
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-[1280px] px-6 py-12 space-y-8">
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
              <Can
                action="boards.create"
                fallback={
                  <p className="text-xs text-muted-foreground">
                    You need editor or admin access to create boards.
                  </p>
                }
              >
                <div className="inline-flex">
                  <CreateBoardDialog userId={session!.user.id} variant="primary" />
                </div>
              </Can>
            </div>
          ) : (
            <BoardsBrowser items={items} onDelete={(id) => del.mutate(id)} />
          )}
        </div>
      </section>
    </>
  );
}

function BoardsBrowser({ items, onDelete }: { items: BoardRow[]; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [win, setWin] = useState<UpdatedWindow>("all");

  const q = query.trim().toLowerCase();
  const now = Date.now();
  const filtered = items
    .filter((b) =>
      q
        ? b.title.toLowerCase().includes(q) || (b.description ?? "").toLowerCase().includes(q)
        : true,
    )
    .filter((b) => {
      if (win === "all") return true;
      return now - new Date(b.updated_at).getTime() <= WINDOW_MS[win];
    })
    .sort((a, b) => {
      switch (sort) {
        case "name_asc":
          return a.title.localeCompare(b.title);
        case "created_desc":
          return +new Date(b.created_at) - +new Date(a.created_at) < 0 ? 1 : -1;
        case "updated_asc":
          return +new Date(a.updated_at) - +new Date(b.updated_at);
        case "updated_desc":
        default:
          return +new Date(b.updated_at) - +new Date(a.updated_at);
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards by name…"
            aria-label="Search boards by name"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={win} onValueChange={(v) => setWin(v as UpdatedWindow)}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by last updated">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="7d">Updated in 7 days</SelectItem>
              <SelectItem value="30d">Updated in 30 days</SelectItem>
              <SelectItem value="90d">Updated in 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[180px]" aria-label="Sort boards">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">Recently updated</SelectItem>
              <SelectItem value="updated_asc">Least recently updated</SelectItem>
              <SelectItem value="created_desc">Newest first</SelectItem>
              <SelectItem value="name_asc">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {items.length} board{items.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <FolderKanban className="mx-auto h-9 w-9 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-semibold text-foreground">No boards match your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search term or time window.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BoardCard key={b.id} board={b} onDelete={() => onDelete(b.id)} />
          ))}
        </div>
      )}
    </div>
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
        <Can action="boards.delete">
          <button
            onClick={() => {
              if (confirm(`Delete board "${board.title}"? This cannot be undone.`)) onDelete();
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete board"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Can>
      </div>
    </div>
  );
}

function CreateBoardDialog({
  userId,
  variant = "secondary",
}: {
  userId: string;
  variant?: "primary" | "secondary";
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      setErrorMsg(null);
      return createBoard({ userId, title, description, onProgress: setProgress });
    },
    onSuccess: (b) => {
      toast.success(`Board "${b.title}" created.`);
      qc.invalidateQueries({ queryKey: ["boards"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setProgress(null);
      navigate({ to: "/boards/$boardId", params: { boardId: b.id } });
    },
    onError: (e: Error) => {
      setProgress(null);
      setErrorMsg(e.message);
      toast.error(e.message);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setErrorMsg(null);
          setProgress(null);
        }
      }}
    >
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
          {progress && create.isPending && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{progress}</span>
            </div>
          )}
          {errorMsg && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <strong>Could not create board.</strong> {errorMsg}
              <div className="mt-1 text-[11px] opacity-80">
                Try again — if this persists, contact support with the message above.
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !title.trim()}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {errorMsg ? "Retry" : "Create"} &amp; Open{" "}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
