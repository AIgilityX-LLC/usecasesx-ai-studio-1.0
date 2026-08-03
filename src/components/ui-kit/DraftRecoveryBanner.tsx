import { Button } from "@/components/ui/button";
import { describeSavedAt } from "@/lib/drafts";

/**
 * Explicit draft recovery. A cached draft is never applied silently: the user
 * sees what was found, when it was written, and whether the saved record has
 * moved on since (a conflict) before deciding.
 */
export function DraftRecoveryBanner({
  label,
  savedAt,
  conflict = false,
  serverUpdatedAt,
  onRestore,
  onDiscard,
}: {
  /** Short human description of the cached work, e.g. the draft title. */
  label: string;
  savedAt?: string | null;
  /** True when the saved record changed after this draft was written. */
  conflict?: boolean;
  serverUpdatedAt?: string | null;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="status"
      data-testid="draft-recovery-banner"
      className={
        conflict
          ? "flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {conflict ? "Draft conflict on this device" : "Unsaved draft found on this device"}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          “{label}” · {savedAt ? describeSavedAt(savedAt) : "saved earlier"}
        </p>
        {conflict ? (
          <p className="mt-1 text-sm text-muted-foreground">
            The saved version changed {describeSavedAt(serverUpdatedAt)} — restoring replaces it
            with your device copy.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant={conflict ? "destructive" : "default"} onClick={onRestore}>
          {conflict ? "Use my device copy" : "Restore draft"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          {conflict ? "Keep saved version" : "Discard"}
        </Button>
      </div>
    </div>
  );
}
