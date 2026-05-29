import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BUILTIN_PRESETS, presetsStore, useSavedPresets } from "@/lib/usecasex.presets";

export function PresetBar({ currentSearch }: { currentSearch: Record<string, unknown> }) {
  const saved = useSavedPresets();
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");

  const copyShareLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleSave = () => {
    const p = presetsStore.save(name, currentSearch);
    if (p) {
      toast.success(`Saved preset "${p.name}"`);
      setName("");
      setShowSave(false);
    }
  };

  const filterCount = Object.values(currentSearch).filter((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))).length;

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Quick presets
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyShareLink}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary"
          >
            Copy share link
          </button>
          <button
            onClick={() => setShowSave((v) => !v)}
            disabled={filterCount === 0}
            className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            Save this view
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {BUILTIN_PRESETS.map((p) => (
          <Link
            key={p.label}
            to="/ai-hub/usecasex/explore"
            search={p.search as never}
            title={p.description}
            className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            {p.label}
          </Link>
        ))}
      </div>

      {showSave && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this view (e.g. 'EU Banking — High Value')"
            className="min-w-[260px] flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      )}

      {saved.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            My saved presets
          </div>
          <div className="flex flex-wrap gap-2">
            {saved.map((p) => (
              <div
                key={p.id}
                className="group inline-flex items-center gap-1 rounded-full border border-border bg-background pl-3 text-[11px] font-semibold text-foreground"
              >
                <Link
                  to="/ai-hub/usecasex/explore"
                  search={p.search as never}
                  className="py-1 hover:text-primary"
                >
                  {p.name}
                </Link>
                <button
                  onClick={() => {
                    presetsStore.remove(p.id);
                    toast.success(`Removed "${p.name}"`);
                  }}
                  aria-label={`Remove preset ${p.name}`}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
