import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bookmark, Check, Pencil, Trash2, X } from "lucide-react";
import { presetsStore, useSavedPresets } from "@/lib/usecasex.presets";

/**
 * Dropdown to manage saved repository views (filter configurations):
 * apply, rename, and delete. Backed by the localStorage presets store.
 */
export function SavedViewsMenu() {
  const saved = useSavedPresets();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const apply = (search: Record<string, unknown>) => {
    navigate({ to: "/repository", search: search as never });
    setOpen(false);
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setDraftName(name);
  };

  const commitRename = (id: string) => {
    const name = draftName.trim();
    if (name) {
      presetsStore.rename(id, name);
      toast.success("View renamed");
    }
    setEditingId(null);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary"
      >
        <Bookmark className="h-3.5 w-3.5 text-primary" />
        Saved views
        {saved.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{saved.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-elegant)]">
          {saved.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No saved views yet. Set your filters, then use “Save this view”.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {saved.map((p) => (
                <li key={p.id} className="group rounded-lg hover:bg-secondary/60">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1 p-1.5">
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(p.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                      <button onClick={() => commitRename(p.id)} aria-label="Save name" className="grid h-7 w-7 place-items-center rounded-md text-primary hover:bg-primary/10">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} aria-label="Cancel" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 p-1.5">
                      <button
                        onClick={() => apply(p.search)}
                        className="min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-medium text-foreground"
                        title={`Apply "${p.name}"`}
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={() => startRename(p.id, p.name)}
                        aria-label={`Rename ${p.name}`}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          presetsStore.remove(p.id);
                          toast.success(`Removed "${p.name}"`);
                        }}
                        aria-label={`Delete ${p.name}`}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
