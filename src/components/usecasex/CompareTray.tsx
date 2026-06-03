import { Link } from "@tanstack/react-router";
import { compareStore, useCompare } from "@/lib/usecasex.compare.store";

/** Floating bottom-right tray that shows current compare selection. */
export function CompareTray() {
  const slugs = useCompare();
  if (!slugs.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 shadow-[var(--shadow-elegant)] backdrop-blur">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Compare
        </span>
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          {slugs.length} / {compareStore.MAX}
        </span>
        <Link
          to="/compare"
          search={{ ids: slugs.join(",") }}
          className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110"
        >
          Compare now →
        </Link>
        <button
          onClick={() => compareStore.clear()}
          className="text-[11px] font-semibold text-muted-foreground hover:text-destructive"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/** Button to add/remove a specific use case from the compare selection. */
export function CompareToggle({ slug, className = "" }: { slug: string; className?: string }) {
  const slugs = useCompare();
  const active = slugs.includes(slug);
  const full = slugs.length >= compareStore.MAX && !active;
  return (
    <button
      type="button"
      onClick={() => compareStore.toggle(slug)}
      disabled={full}
      className={
        "rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary") +
        " " +
        className
      }
      title={full ? `Compare is full (max ${compareStore.MAX})` : active ? "Remove from compare" : "Add to compare"}
    >
      {active ? "✓ In compare" : full ? "Compare full" : "Add to compare"}
    </button>
  );
}
