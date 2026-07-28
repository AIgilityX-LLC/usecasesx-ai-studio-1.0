import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  FileQuestion,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Library,
  GripVertical,
  Search,
} from "lucide-react";
import { CalendarClock, History, ListChecks, Clock } from "lucide-react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import {
  createBoardUseCase,
  listSavedCatalogUseCases,
  addSavedUseCaseToBoard,
  renameBoard,
  deleteBoard,
  removeBoardUseCase,
  reorderBoardUseCases,
  DuplicateBoardItemError,
  listRepositoryUseCasesForBoard,
} from "@/lib/boards";
import {
  loadBoardWithItems,
  type LoadedBoardItem,
  type LoadedBoard,
  type BoardAuditNote,
} from "@/lib/boards.functions";
import { Bookmark } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
      err?.kind ??
      err?.cause?.kind ??
      (err?.statusCode === 403 ? "forbidden" : err?.statusCode === 404 ? "not_found" : "error");
    const Icon =
      kind === "forbidden" ? ShieldAlert : kind === "not_found" ? FileQuestion : ShieldAlert;
    const heading =
      kind === "forbidden"
        ? "Access denied"
        : kind === "not_found"
          ? "Board not found"
          : "Couldn't load this board";
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <Icon className="mx-auto h-10 w-10 text-muted-foreground/70" />
        <h2 className="mt-4 text-xl font-bold text-foreground">{heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {err?.message ?? "An unexpected error prevented this board from loading."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => board.refetch()}>
            Try again
          </Button>
          <Button asChild>
            <Link to="/boards">← All boards</Link>
          </Button>
        </div>
      </div>
    );
  }

  const b = board.data.board;
  const list = board.data.items;
  const auditNotes = board.data.auditNotes ?? [];

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
          <div className="flex flex-wrap gap-2">
            <RenameBoardDialog
              boardId={boardId}
              currentTitle={b.title}
              currentDescription={b.description}
            />
            <DeleteBoardButton boardId={boardId} title={b.title} />
            <AddSavedDialog userId={session!.user.id} boardId={boardId} />
            <AddFromRepositoryDialog userId={session!.user.id} boardId={boardId} />
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
              <AddFromRepositoryDialog userId={session!.user.id} boardId={boardId} />
              <AddItemDialog userId={session!.user.id} boardId={boardId} />
              <Button asChild variant="outline">
                <Link to="/repository">Browse catalog</Link>
              </Button>
            </div>
          </div>
        ) : (
          <BoardItemList boardId={boardId} items={list} userId={session!.user.id} />
        )}

        <BoardMetadataPanel board={b} itemCount={list.length} auditNotes={auditNotes} />
      </div>
    </section>
  );
}

function BoardMetadataPanel({
  board,
  itemCount,
  auditNotes,
}: {
  board: LoadedBoard;
  itemCount: number;
  auditNotes: BoardAuditNote[];
}) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Board metadata
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <ListChecks className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="font-semibold text-foreground">{board.title}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Library className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <dt className="text-xs text-muted-foreground">Included use cases</dt>
              <dd className="font-semibold text-foreground">{itemCount}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="font-semibold text-foreground">{fmt(board.created_at)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <dt className="text-xs text-muted-foreground">Last updated</dt>
              <dd className="font-semibold text-foreground">{fmt(board.updated_at)}</dd>
            </div>
          </div>
        </dl>
      </div>
      <AuditNotesPanel auditNotes={auditNotes} fmt={fmt} />
    </div>
  );
}

const AUDIT_PAGE_SIZE = 5;

function auditActionLabel(eventType: string): string {
  const t = eventType.toLowerCase();
  if (t.includes("delete") || t.includes("remove")) return "Removed";
  if (t.includes("create") || t.includes("add")) return "Added";
  if (t.includes("rename") || t.includes("update") || t.includes("edit")) return "Updated";
  if (t.includes("reorder") || t.includes("move")) return "Reordered";
  return "Activity";
}

function auditLabelClass(label: string): string {
  switch (label) {
    case "Removed":
      return "bg-destructive/10 text-destructive";
    case "Added":
      return "bg-primary/10 text-primary";
    case "Updated":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "Reordered":
      return "bg-secondary text-muted-foreground";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}

function AuditNotesPanel({
  auditNotes,
  fmt,
}: {
  auditNotes: BoardAuditNote[];
  fmt: (iso: string) => string;
}) {
  const [visible, setVisible] = useState(AUDIT_PAGE_SIZE);
  const shown = auditNotes.slice(0, visible);
  return (
    <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
      <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <History className="h-3.5 w-3.5" /> Activity &amp; audit notes
      </h2>
      {auditNotes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No recorded activity yet. Board changes are captured in your workspace audit trail.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {shown.map((n) => {
              const label = auditActionLabel(n.event_type);
              return (
                <li key={n.id} className="flex items-start gap-3 border-l-2 border-primary/40 pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${auditLabelClass(label)}`}
                      >
                        {label}
                      </span>
                      <p className="text-sm font-medium capitalize text-foreground">{n.summary}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <time dateTime={n.created_at} title={fmt(n.created_at)}>
                        {fmt(n.created_at)} · {relativeTime(n.created_at)}
                      </time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {visible < auditNotes.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + AUDIT_PAGE_SIZE)}
              className="mt-4 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
            >
              Load more ({auditNotes.length - visible} older)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function BoardItemList({
  boardId,
  items,
  userId,
}: {
  boardId: string;
  items: LoadedBoardItem[];
  userId: string;
}) {
  const qc = useQueryClient();
  // Local order for snappy reordering; resynced when server items change.
  const [order, setOrder] = useState<LoadedBoardItem[]>(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  useEffect(() => {
    setOrder(items);
  }, [items]);

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => reorderBoardUseCases({ boardId, orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId, "full"] }),
    onError: (e: Error) => {
      toast.error(e.message);
      setOrder(items);
    },
  });

  const [pendingRemove, setPendingRemove] = useState<LoadedBoardItem | null>(null);

  const restore = useMutation({
    mutationFn: (item: LoadedBoardItem) =>
      createBoardUseCase({
        userId,
        boardId,
        title: item.title,
        problem: item.problem_statement ?? undefined,
        aiType: item.ai_type ?? undefined,
      }),
    onSuccess: () => {
      toast.success("Use case restored to board.");
      qc.invalidateQueries({ queryKey: ["board", boardId, "full"] });
      qc.invalidateQueries({ queryKey: ["boards", "list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (item: LoadedBoardItem) => removeBoardUseCase(item.id),
    onSuccess: (_data, item) => {
      qc.invalidateQueries({ queryKey: ["board", boardId, "full"] });
      qc.invalidateQueries({ queryKey: ["boards", "list"] });
      toast.success(`"${item.title}" removed from board.`, {
        action: { label: "Undo", onClick: () => restore.mutate(item) },
        duration: 8000,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    reorder.mutate(next.map((i) => i.id));
  };

  const commitDrop = (from: number, to: number) => {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    reorder.mutate(next.map((i) => i.id));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Drag the handle to reorder use cases, or use the up/down arrows.
      </p>
      {order.map((uc, index) => (
        <div
          key={uc.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(index);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null) commitDrop(dragIndex, index);
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-elegant)] ${
            overIndex === index && dragIndex !== null && dragIndex !== index
              ? "border-primary ring-1 ring-primary"
              : "border-border"
          } ${dragIndex === index ? "opacity-50" : ""}`}
        >
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <span
              className="cursor-grab text-muted-foreground/60 active:cursor-grabbing"
              aria-hidden
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <button
              onClick={() => move(index, -1)}
              disabled={index === 0 || reorder.isPending}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => move(index, 1)}
              disabled={index === order.length - 1 || reorder.isPending}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {uc.status}
              </span>
              {uc.ai_type && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  {uc.ai_type}
                </span>
              )}
            </div>
            <Link
              to="/studio/use-case/$id"
              params={{ id: uc.id }}
              className="text-base font-bold text-foreground hover:text-primary"
            >
              {uc.title}
            </Link>
            {uc.problem_statement && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {uc.problem_statement}
              </p>
            )}
            <Link
              to="/studio/use-case/$id"
              params={{ id: uc.id }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
            >
              Open in Studio <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <button
            onClick={() => setPendingRemove(uc)}
            disabled={remove.isPending}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove ${uc.title} from board`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <AlertDialog
        open={!!pendingRemove}
        onOpenChange={(o) => {
          if (!o) setPendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove use case from board?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingRemove?.title}” will be removed from this board. You can undo this from the
              toast right after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingRemove) remove.mutate(pendingRemove);
                setPendingRemove(null);
              }}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameBoardDialog({
  boardId,
  currentTitle,
  currentDescription,
}: {
  boardId: string;
  currentTitle: string;
  currentDescription: string | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription ?? "");

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setDescription(currentDescription ?? "");
    }
  }, [open, currentTitle, currentDescription]);

  const save = useMutation({
    mutationFn: () => renameBoard({ boardId, title, description }),
    onSuccess: () => {
      toast.success("Board updated.");
      qc.invalidateQueries({ queryKey: ["board", boardId, "full"] });
      qc.invalidateQueries({ queryKey: ["boards", "list"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Pencil className="h-4 w-4" /> Rename
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename board</DialogTitle>
          <DialogDescription>Update the board title and description.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-title">Board title</Label>
            <Input
              id="rename-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rename-desc">Description (optional)</Label>
            <Textarea
              id="rename-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBoardButton({ boardId, title }: { boardId: string; title: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: () => deleteBoard(boardId),
    onSuccess: () => {
      toast.success("Board deleted.");
      qc.invalidateQueries({ queryKey: ["boards"] });
      navigate({ to: "/boards", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        className="gap-1.5 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this board?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” and all of its use cases will be permanently removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              del.mutate();
            }}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete board
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
          <DialogDescription>
            Start with a title; you can build the rest in Studio.
          </DialogDescription>
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
    onError: (e: Error) => {
      if (e instanceof DuplicateBoardItemError || e.name === "DuplicateBoardItemError") {
        toast.warning(e.message || "This use case is already on the board.");
      } else {
        toast.error(e.message);
      }
    },
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
              <Button size="sm" onClick={() => add.mutate(s.use_case_id)} disabled={add.isPending}>
                {add.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                Add
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFromRepositoryDialog({ userId, boardId }: { userId: string; boardId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  // Roving keyboard navigation across the option buttons. Radix Dialog already
  // provides focus trapping + escape-to-close; this adds arrow/Home/End nav and
  // skips disabled ("On board") items.
  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [],
    );
    if (buttons.length === 0) return;
    e.preventDefault();
    const current = document.activeElement as HTMLElement | null;
    const idx = buttons.findIndex((b) => b === current);
    let next = 0;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = buttons.length - 1;
    else if (e.key === "ArrowDown") next = idx < 0 ? 0 : Math.min(idx + 1, buttons.length - 1);
    else if (e.key === "ArrowUp") next = idx < 0 ? buttons.length - 1 : Math.max(idx - 1, 0);
    buttons[next]?.focus();
  };

  const repo = useQuery({
    queryKey: ["repo-usecases", boardId, search],
    queryFn: () => listRepositoryUseCasesForBoard(boardId, { search }),
    enabled: open,
  });

  const add = useMutation({
    mutationFn: async (ids: string[]) => {
      let added = 0;
      let dupes = 0;
      for (const id of ids) {
        try {
          await addSavedUseCaseToBoard({ userId, boardId, catalogUseCaseId: id });
          added += 1;
        } catch (e: any) {
          if (e instanceof DuplicateBoardItemError || e?.name === "DuplicateBoardItemError")
            dupes += 1;
          else throw e;
        }
      }
      return { added, dupes };
    },
    onSuccess: ({ added, dupes }) => {
      if (added > 0) toast.success(`${added} use case${added === 1 ? "" : "s"} added to board.`);
      if (dupes > 0) toast.warning(`${dupes} skipped — already on this board.`);
      if (added === 0 && dupes === 0) toast.info("Nothing selected.");
      qc.invalidateQueries({ queryKey: ["board", boardId, "full"] });
      qc.invalidateQueries({ queryKey: ["boards", "list"] });
      qc.invalidateQueries({ queryKey: ["repo-usecases", boardId] });
      setSelected(new Set());
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSelected(new Set());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Library className="h-4 w-4" /> Add from Repository
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add use cases from the repository</DialogTitle>
          <DialogDescription>
            Select one or more use cases to add to this board. Items already on the board are
            disabled to prevent duplicates.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search use cases by title…"
            className="pl-9"
          />
        </div>
        <div
          ref={listRef}
          role="listbox"
          aria-label="Repository use cases"
          aria-multiselectable="true"
          onKeyDown={onListKeyDown}
          className="max-h-[420px] space-y-2 overflow-y-auto"
        >
          {repo.isLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading repository…
            </div>
          )}
          {repo.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {(repo.error as Error).message}
            </div>
          )}
          {repo.data && repo.data.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No use cases found.
            </div>
          )}
          {repo.data?.map((r) => {
            const isSelected = selected.has(r.use_case_id);
            return (
              <button
                key={r.use_case_id}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={r.already_on_board}
                onClick={() => toggle(r.use_case_id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border text-[11px] font-bold ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {r.title}
                  </span>
                  {r.summary && (
                    <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                      {r.summary}
                    </span>
                  )}
                </span>
                {r.already_on_board && (
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    On board
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={add.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => add.mutate([...selected])}
            disabled={add.isPending || selected.size === 0}
          >
            {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {selected.size > 0 ? `${selected.size} ` : ""}to board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
