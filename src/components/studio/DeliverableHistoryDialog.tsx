import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { History, Loader2, RotateCcw } from "lucide-react";
import {
  loadDeliverableVersions,
  revertDeliverableToVersion,
  type DeliverableVersionRow,
} from "@/lib/deliverables.data";
import { DELIVERABLE_META, type DeliverableType } from "@/lib/deliverables";
import { describeSavedAt } from "@/lib/drafts";

const ORIGIN_LABEL: Record<string, string> = {
  authored: "Authored",
  generated: "Generated",
  reverted: "Reverted",
};

/** Rough "what is inside" signal so a version is recognisable without opening it. */
function describeContent(content: Record<string, unknown>): string {
  const sections = Array.isArray(content?.sections) ? content.sections.length : 0;
  if (sections) return `${sections} section${sections === 1 ? "" : "s"}`;
  const filled = Object.values(content ?? {}).filter((v) =>
    typeof v === "string" ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : v != null,
  ).length;
  return filled ? `${filled} field${filled === 1 ? "" : "s"} completed` : "Empty";
}

/**
 * Version history for one deliverable. Reverting never destroys the current
 * content — it appends a new version, so the trail stays auditable.
 */
export function DeliverableHistoryDialog({
  open,
  onOpenChange,
  useCaseId,
  type,
  onReverted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useCaseId: string;
  type: DeliverableType | null;
  onReverted?: () => void | Promise<void>;
}) {
  const [versions, setVersions] = useState<DeliverableVersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !type) return;
    let cancelled = false;
    setLoading(true);
    loadDeliverableVersions(useCaseId, type)
      .then((rows) => {
        if (!cancelled) setVersions(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("We could not load the version history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, type, useCaseId]);

  const revert = async (version: DeliverableVersionRow) => {
    if (!type) return;
    setReverting(version.id);
    try {
      await revertDeliverableToVersion(useCaseId, type, version);
      const rows = await loadDeliverableVersions(useCaseId, type);
      setVersions(rows);
      await onReverted?.();
      toast.success(`Restored version ${version.version}.`);
    } catch {
      toast.error("We could not restore that version. Try again.");
    } finally {
      setReverting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" aria-hidden />
            Version history
          </DialogTitle>
          <DialogDescription>
            {type ? DELIVERABLE_META[type].label : "Deliverable"} — every save and generation is
            kept, so you can compare and go back.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No versions yet. The first save or generation starts the history.
          </p>
        ) : (
          <ScrollArea className="max-h-80 pr-3">
            <ul className="space-y-2">
              {versions.map((v, i) => (
                <li key={v.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">Version {v.version}</span>
                        {i === 0 && <Badge variant="secondary">Current</Badge>}
                        <Badge variant="outline" className="text-[10px]">
                          {ORIGIN_LABEL[v.origin] ?? v.origin}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {describeSavedAt(v.created_at)} · {describeContent(v.content ?? {})}
                        {v.summary ? ` · ${v.summary}` : ""}
                      </p>
                    </div>
                    {i !== 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reverting !== null}
                        onClick={() => revert(v)}
                      >
                        {reverting === v.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3 w-3" />
                        )}
                        Restore
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <Separator />
        <p className="text-[11px] text-muted-foreground">
          Restoring appends a new version rather than deleting anything.
        </p>
      </DialogContent>
    </Dialog>
  );
}
