import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeSavedAt, type AutosaveState } from "@/lib/drafts";

/**
 * One consistent autosave indicator across every authoring surface, so a user
 * always knows whether their work reached the workspace or is only on this
 * device. Never claims "Saved" unless the server confirmed it.
 */
export function AutosaveStatus({
  state,
  savedAt,
  className,
}: {
  state: AutosaveState;
  /** ISO timestamp of the last confirmed server save. */
  savedAt?: string | null;
  className?: string;
}) {
  const base = "inline-flex items-center gap-1.5 text-xs";

  if (state === "idle") return null;

  if (state === "saving") {
    return (
      <span role="status" aria-live="polite" className={cn(base, "text-muted-foreground", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }

  if (state === "saved") {
    return (
      <span role="status" aria-live="polite" className={cn(base, "text-muted-foreground", className)}>
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
        Saved {savedAt ? describeSavedAt(savedAt) : ""}
      </span>
    );
  }

  if (state === "local") {
    return (
      <span role="status" aria-live="polite" className={cn(base, "text-muted-foreground", className)}>
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        Kept on this device only
      </span>
    );
  }

  if (state === "error") {
    return (
      <span role="status" aria-live="polite" className={cn(base, "text-destructive", className)}>
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
        Not saved — retry
      </span>
    );
  }

  return (
    <span role="status" aria-live="polite" className={cn(base, "text-muted-foreground", className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      Unsaved changes
    </span>
  );
}
