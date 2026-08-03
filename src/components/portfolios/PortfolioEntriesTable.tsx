/**
 * Executive table view of portfolio membership.
 *
 * Read-heavy: it shows the source use case's own attributes (status, value,
 * complexity) alongside the portfolio-specific decision fields. Inline edits
 * write only to the membership record.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog, ResponsiveTable, type ResponsiveColumn } from "@/components/ui-kit";
import {
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISIONS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  type PortfolioEntry,
  type PortfolioItemDecision,
} from "@/lib/portfolio-model";

type BulkStore = {
  updatePortfolioEntry: (
    portfolioId: string,
    useCaseId: string,
    patch: { decision?: PortfolioItemDecision },
  ) => Promise<unknown>;
  removeUseCasesFromPortfolio: (portfolioId: string, useCaseIds: string[]) => Promise<unknown>;
  isBulkUpdating: boolean;
};

export function PortfolioEntriesTable({
  portfolioId,
  entries,
  store,
}: {
  portfolioId: string;
  entries: PortfolioEntry[];
  store: BulkStore;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<PortfolioItemDecision | "">("");

  const selectableIds = useMemo(() => entries.map((e) => e.useCaseId), [entries]);
  const allSelected = selected.length > 0 && selected.length === selectableIds.length;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const applyBulkDecision = async () => {
    if (!bulkDecision || selected.length === 0) return;
    try {
      for (const id of selected) {
        await store.updatePortfolioEntry(portfolioId, id, { decision: bulkDecision });
      }
      toast.success(
        `Decision set to "${PORTFOLIO_ITEM_DECISION_LABELS[bulkDecision]}" for ${selected.length} use case${selected.length === 1 ? "" : "s"}`,
      );
      setSelected([]);
      setBulkDecision("");
    } catch {
      toast.error("Could not update every selected use case");
    }
  };

  const columns: ResponsiveColumn<PortfolioEntry>[] = [
    {
      key: "select",
      hideOnMobile: true,
      header: (
        <Checkbox
          checked={allSelected}
          aria-label="Select all use cases"
          onCheckedChange={(v) => setSelected(v === true ? selectableIds : [])}
        />
      ),
      cell: (row) => (
        <Checkbox
          checked={selected.includes(row.useCaseId)}
          aria-label={`Select ${row.useCaseTitle ?? row.useCaseId}`}
          onCheckedChange={() => toggle(row.useCaseId)}
        />
      ),
      className: "w-10",
    },
    {
      key: "title",
      header: "Use case",
      cell: (row) => (
        <div className="min-w-0">
          {row.useCaseSlug ? (
            <Link
              to="/use-cases/$slug"
              params={{ slug: row.useCaseSlug }}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {row.useCaseTitle ?? row.useCaseSlug}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{row.useCaseTitle ?? "Untitled"}</span>
          )}
          {row.functionName && <p className="text-xs text-muted-foreground">{row.functionName}</p>}
        </div>
      ),
    },
    {
      key: "rank",
      header: "Rank",
      cell: (row) => (
        <span className="tabular-nums text-sm">
          {row.rank ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      className: "w-16",
    },
    {
      key: "value",
      header: "Value",
      cell: (row) => <span className="text-sm">{row.valuePotential ?? "—"}</span>,
    },
    {
      key: "complexity",
      header: "Complexity",
      cell: (row) => <span className="text-sm">{row.complexity ?? "—"}</span>,
    },
    {
      key: "decision",
      header: "Decision",
      cell: (row) => (
        <Select
          value={row.decision}
          onValueChange={(v) =>
            void store
              .updatePortfolioEntry(portfolioId, row.useCaseId, {
                decision: v as PortfolioItemDecision,
              })
              .catch(() => toast.error("Could not save the decision"))
          }
        >
          <SelectTrigger
            className="h-8 w-[10.5rem]"
            aria-label={`Decision for ${row.useCaseTitle ?? row.useCaseId}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PORTFOLIO_ITEM_DECISIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {PORTFOLIO_ITEM_DECISION_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "period",
      header: "Target period",
      cell: (row) => <span className="text-sm">{row.targetPeriod || "—"}</span>,
    },
    {
      key: "funding",
      header: "Funding",
      cell: (row) => (
        <Badge variant="secondary" className="text-[11px]">
          {FUNDING_STATE_LABELS[row.fundingState]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2">
          <span className="text-sm text-muted-foreground">{selected.length} selected</span>
          <Select
            value={bulkDecision}
            onValueChange={(v) => setBulkDecision(v as PortfolioItemDecision)}
          >
            <SelectTrigger className="h-8 w-[11rem]" aria-label="Bulk decision">
              <SelectValue placeholder="Set decision…" />
            </SelectTrigger>
            <SelectContent>
              {PORTFOLIO_ITEM_DECISIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {PORTFOLIO_ITEM_DECISION_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkDecision || store.isBulkUpdating}
            onClick={() => void applyBulkDecision()}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={store.isBulkUpdating}
            onClick={() => setConfirmRemove(true)}
          >
            Remove from portfolio
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      <ResponsiveTable
        columns={columns}
        rows={entries}
        rowKey={(row) => row.useCaseId}
        caption="Portfolio entries"
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        destructive
        title="Remove selected use cases?"
        description="They are removed from this portfolio only. The use cases and their scores are not affected."
        confirmLabel="Remove"
        onConfirm={() => {
          void store
            .removeUseCasesFromPortfolio(portfolioId, selected)
            .then(() => {
              toast.success("Removed from portfolio");
              setSelected([]);
            })
            .catch(() => toast.error("Could not remove the selected use cases"));
          setConfirmRemove(false);
        }}
      />
    </div>
  );
}
