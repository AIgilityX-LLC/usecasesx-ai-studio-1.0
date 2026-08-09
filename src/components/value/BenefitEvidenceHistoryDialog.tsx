/**
 * Evidence revision history for one benefit.
 *
 * Revisions are reconstructed from the append-only audit trail. Restoring an
 * earlier state writes it back as a new revision, so nothing in the timeline
 * is ever overwritten.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, FileText, Link2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui-kit";

import {
  listEvidenceRevisions,
  restoreEvidenceRevision,
} from "@/lib/domain/benefit-evidence-history.repository";
import { getEvidenceUrl } from "@/lib/domain/benefit-evidence.repository";
import { toUserMessage } from "@/lib/domain/errors";
import type { Benefit, BenefitEvidenceItem } from "@/lib/value/benefits.model";

export function BenefitEvidenceHistoryDialog({
  benefit,
  open,
  onOpenChange,
}: {
  benefit: Benefit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["benefit-evidence-history", benefit?.useCaseId, benefit?.id],
    queryFn: () => listEvidenceRevisions(benefit!.useCaseId, benefit!.id),
    enabled: open && Boolean(benefit),
    staleTime: 10_000,
  });

  const restore = useMutation({
    mutationFn: (items: BenefitEvidenceItem[]) => restoreEvidenceRevision(benefit!.id, items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["use-case-benefits", benefit?.useCaseId] });
      void queryClient.invalidateQueries({ queryKey: ["benefit-evidence-history"] });
      void queryClient.invalidateQueries({ queryKey: ["use-case-benefit-audit"] });
      toast.success("Evidence restored to the selected revision");
    },
  });

  const handleRestore = async (revisionId: string, items: BenefitEvidenceItem[]) => {
    setRestoringId(revisionId);
    try {
      await restore.mutateAsync(items);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setRestoringId(null);
    }
  };

  const openFile = async (path: string) => {
    try {
      const url = await getEvidenceUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  };

  const revisions = query.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Evidence history</DialogTitle>
          <DialogDescription>
            {benefit?.name} — every change to the attached proof, newest first.
          </DialogDescription>
        </DialogHeader>

        {query.error ? (
          <ErrorState description={toUserMessage(query.error)} />
        ) : query.isLoading ? (
          <LoadingSkeleton />
        ) : revisions.length === 0 ? (
          <EmptyState
            title="No evidence revisions yet"
            description="Attach a link or upload a document to start the evidence trail."
          />
        ) : (
          <ol className="space-y-3">
            {revisions.map((revision) => (
              <li key={revision.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {new Date(revision.at).toLocaleString()}
                    </span>
                    {revision.isCurrent && <Badge variant="secondary">Current</Badge>}
                  </div>
                  {!revision.isCurrent && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restore.isPending}
                      onClick={() => void handleRestore(revision.id, revision.items)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      {restoringId === revision.id ? "Restoring…" : "Restore"}
                    </Button>
                  )}
                </div>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  {revision.items.length} attachment{revision.items.length === 1 ? "" : "s"}
                  {revision.added > 0 ? ` · +${revision.added} added` : ""}
                  {revision.removed > 0 ? ` · −${revision.removed} removed` : ""}
                </p>

                {revision.items.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {revision.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs">
                        {item.kind === "link" ? (
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.kind === "link" && item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                          >
                            Open
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        ) : item.path ? (
                          <button
                            type="button"
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={() => void openFile(item.path as string)}
                          >
                            Open
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
