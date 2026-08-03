/**
 * Portfolio-level executive review notes.
 *
 * Notes and the review stamp live on the portfolio record, separate from the
 * per-entry decision notes.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PortfolioReviewNotes({
  notes,
  lastReviewedAt,
  onSave,
}: {
  notes?: string;
  lastReviewedAt?: string;
  onSave: (patch: { reviewNotes: string; markReviewed: boolean }) => Promise<unknown>;
}) {
  const [value, setValue] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(notes ?? "");
  }, [notes]);

  const dirty = value !== (notes ?? "");
  const reviewed = lastReviewedAt ? new Date(lastReviewedAt) : null;
  const reviewedLabel =
    reviewed && !Number.isNaN(reviewed.getTime()) ? reviewed.toLocaleString() : null;

  const save = async (markReviewed: boolean) => {
    setSaving(true);
    try {
      await onSave({ reviewNotes: value, markReviewed });
      toast.success(markReviewed ? "Review recorded" : "Review notes saved");
    } catch {
      toast.error("Could not save the review notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Decisions taken, blockers, and what the next review must resolve."
        aria-label="Portfolio review notes"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={saving || !dirty} onClick={() => void save(false)}>
          Save notes
        </Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => void save(true)}>
          Mark reviewed today
        </Button>
        <span className="text-xs text-muted-foreground">
          {reviewedLabel ? `Last reviewed ${reviewedLabel}` : "Not reviewed yet"}
        </span>
      </div>
    </div>
  );
}
