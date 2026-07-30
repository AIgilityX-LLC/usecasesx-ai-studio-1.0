/**
 * Field-level change viewer. Used both for AI suggestions (proposed change
 * before you accept it) and for version history (what changed since a
 * completed version).
 */

import type { ValueChange } from "@/lib/studio-wizard";

export function DiffView({ changes, className }: { changes: ValueChange[]; className?: string }) {
  if (changes.length === 0) {
    return <p className="text-xs text-muted-foreground">No differences.</p>;
  }
  return (
    <ul className={`space-y-1 text-sm ${className ?? ""}`}>
      {changes.map((c, i) => (
        <li
          key={`${c.kind}-${i}`}
          className={
            c.kind === "added"
              ? "rounded border border-primary/40 bg-primary/10 px-2 py-1"
              : c.kind === "removed"
                ? "rounded border border-destructive/40 bg-destructive/10 px-2 py-1 line-through decoration-destructive/60"
                : "px-2 py-1 text-muted-foreground"
          }
        >
          <span className="mr-2 select-none font-mono text-[11px] uppercase" aria-hidden>
            {c.kind === "added" ? "+" : c.kind === "removed" ? "−" : "="}
          </span>
          <span className="sr-only">
            {c.kind === "added" ? "Added: " : c.kind === "removed" ? "Removed: " : "Unchanged: "}
          </span>
          {c.value}
        </li>
      ))}
    </ul>
  );
}
