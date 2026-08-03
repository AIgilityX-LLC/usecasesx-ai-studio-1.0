import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PORTFOLIO_EXPORT_COLUMNS,
  PORTFOLIO_EXPORT_COLUMN_DEFS,
  downloadPortfolio,
  type PortfolioExportColumnKey,
  type PortfolioExportFormat,
} from "@/lib/portfolio-export";
import { PORTFOLIO_ITEM_DECISIONS, PORTFOLIO_ITEM_DECISION_LABELS } from "@/lib/portfolio-model";
import { AUDIT_EVENTS, recordAuditEvent } from "@/lib/telemetry";
import type { Portfolio } from "@/lib/usecasex.store";

const FORMATS: Array<{ value: PortfolioExportFormat; label: string }> = [
  { value: "board-pack", label: "Board pack (PDF)" },
  { value: "pdf", label: "Simple PDF" },
  { value: "csv", label: "CSV (spreadsheet)" },
  { value: "json", label: "JSON (data)" },
];

export function ExportPortfolioDialog({
  portfolio,
  filteredEntries,
}: {
  portfolio: Portfolio;
  /** Currently visible entries; enables the "filtered only" export option. */
  filteredEntries?: Portfolio["entries"];
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<PortfolioExportFormat>("board-pack");
  const [columns, setColumns] = useState<PortfolioExportColumnKey[]>(
    DEFAULT_PORTFOLIO_EXPORT_COLUMNS,
  );
  const [decisions, setDecisions] = useState<string[]>([]);
  const hasFilter = !!filteredEntries && filteredEntries.length !== portfolio.entries.length;
  const [filteredOnly, setFilteredOnly] = useState(true);

  const toggle = <T extends string>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const run = () => {
    try {
      const scoped =
        hasFilter && filteredOnly && filteredEntries
          ? { ...portfolio, entries: filteredEntries }
          : portfolio;
      const fileName = downloadPortfolio(scoped, format, { columns, decisions });
      void recordAuditEvent({
        event: AUDIT_EVENTS.exportGenerated,
        entity: { type: "portfolio", id: portfolio.id },
        next: {
          format,
          file_name: fileName,
          columns,
          decision_filter: decisions,
          filtered_only: hasFilter && filteredOnly,
          entry_count: scoped.entries.length,
        },
      });
      toast.success(`Exported ${fileName}`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={portfolio.entries.length === 0}>
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export portfolio</DialogTitle>
          <DialogDescription>
            Choose the format, the fields and which decisions to include. Exports never change the
            portfolio or its use cases.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Format
            </Label>
            <Select value={format} onValueChange={(v) => setFormat(v as PortfolioExportFormat)}>
              <SelectTrigger aria-label="Export format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fields
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PORTFOLIO_EXPORT_COLUMN_DEFS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={columns.includes(col.key)}
                    onCheckedChange={() => toggle(columns, col.key, setColumns)}
                    aria-label={col.label}
                  />
                  {col.label}
                </label>
              ))}
            </div>
            {columns.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No fields selected — the full default set will be used.
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Decisions to include
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PORTFOLIO_ITEM_DECISIONS.map((decision) => (
                <label key={decision} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={decisions.includes(decision)}
                    onCheckedChange={() => toggle(decisions, decision, setDecisions)}
                    aria-label={PORTFOLIO_ITEM_DECISION_LABELS[decision]}
                  />
                  {PORTFOLIO_ITEM_DECISION_LABELS[decision]}
                </label>
              ))}
            </div>
            {decisions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing selected — every decision is included.
              </p>
            )}
          </fieldset>
        </div>

        <DialogFooter>
          <Button onClick={run}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
