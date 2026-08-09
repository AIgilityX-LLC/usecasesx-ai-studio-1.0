/**
 * Export settings — choose which columns land in the CSV/JSON output.
 * The selection is saved per workspace so the whole team exports the same shape.
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_ROADMAP_COLUMNS,
  ROADMAP_EXPORT_COLUMNS,
  normalizeColumns,
  type RoadmapColumnKey,
} from "@/lib/roadmap-export";

export function RoadmapExportSettingsDialog({
  open,
  onOpenChange,
  columns,
  onSave,
  saving = false,
  canPersist = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: readonly string[] | null;
  onSave: (columns: RoadmapColumnKey[]) => void | Promise<unknown>;
  saving?: boolean;
  canPersist?: boolean;
}) {
  const [selected, setSelected] = useState<RoadmapColumnKey[]>(() => normalizeColumns(columns));

  useEffect(() => {
    if (open) setSelected(normalizeColumns(columns));
  }, [open, columns]);

  const toggle = (key: RoadmapColumnKey, checked: boolean) => {
    setSelected((prev) =>
      checked
        ? DEFAULT_ROADMAP_COLUMNS.filter((k) => k === key || prev.includes(k))
        : prev.filter((k) => k !== key),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export settings</DialogTitle>
          <DialogDescription>
            {canPersist
              ? "Choose the columns included in CSV and JSON exports. Saved for your workspace."
              : "Choose the columns included in CSV and JSON exports for this session."}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Export columns</legend>
          {ROADMAP_EXPORT_COLUMNS.map((column) => (
            <div key={column.key} className="flex items-center gap-2">
              <Checkbox
                id={`col-${column.key}`}
                checked={selected.includes(column.key)}
                onCheckedChange={(checked) => toggle(column.key, checked === true)}
              />
              <Label htmlFor={`col-${column.key}`} className="font-normal">
                {column.label}
              </Label>
            </div>
          ))}
        </fieldset>

        {selected.length === 0 && (
          <p className="text-sm text-destructive">Select at least one column.</p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelected([...DEFAULT_ROADMAP_COLUMNS])}
          >
            Reset to all columns
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selected.length === 0 || saving}
              onClick={async () => {
                await onSave(selected);
                onOpenChange(false);
              }}
            >
              {saving ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
