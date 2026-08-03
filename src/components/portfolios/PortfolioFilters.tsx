/**
 * Advanced filter bar for portfolio entries.
 *
 * Presentation only — it hands a `PortfolioFilterState` back to the caller,
 * which applies it with `applyPortfolioFilters` so the table, cards, charts,
 * metrics and export all agree.
 */

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FUNDING_STATES,
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISIONS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  type PortfolioEntry,
} from "@/lib/portfolio-model";
import {
  EMPTY_PORTFOLIO_FILTERS,
  countActiveFilters,
  distinctValues,
  type PortfolioFilterState,
} from "@/lib/portfolio-filters";

type ListKey = Exclude<keyof PortfolioFilterState, "query" | "studioOnly" | "unrankedOnly">;

function FacetPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) return null;
  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
                aria-label={`${label}: ${option.label}`}
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
            Clear {label.toLowerCase()}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PortfolioFilters({
  entries,
  filters,
  onChange,
  resultCount,
}: {
  entries: PortfolioEntry[];
  filters: PortfolioFilterState;
  onChange: (next: PortfolioFilterState) => void;
  resultCount: number;
}) {
  const set = <K extends keyof PortfolioFilterState>(key: K, value: PortfolioFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const setList = (key: ListKey) => (next: string[]) => set(key, next);

  const options = useMemo(
    () => ({
      value: distinctValues(entries, (e) => e.valuePotential),
      complexity: distinctValues(entries, (e) => e.complexity),
      risk: distinctValues(entries, (e) => e.riskLevel),
      period: distinctValues(entries, (e) => e.targetPeriod),
      fn: distinctValues(entries, (e) => e.functionName),
    }),
    [entries],
  );

  const active = countActiveFilters(filters);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="portfolio-filter-search" className="sr-only">
            Search portfolio entries
          </Label>
          <Input
            id="portfolio-filter-search"
            value={filters.query}
            placeholder="Search title, next action, notes…"
            className="h-9"
            onChange={(e) => set("query", e.target.value)}
          />
        </div>

        <FacetPopover
          label="Decision"
          selected={filters.decisions}
          onChange={setList("decisions")}
          options={PORTFOLIO_ITEM_DECISIONS.map((d) => ({
            value: d,
            label: PORTFOLIO_ITEM_DECISION_LABELS[d],
          }))}
        />
        <FacetPopover
          label="Funding"
          selected={filters.funding}
          onChange={setList("funding")}
          options={FUNDING_STATES.map((f) => ({ value: f, label: FUNDING_STATE_LABELS[f] }))}
        />
        <FacetPopover
          label="Value"
          selected={filters.valuePotential}
          onChange={setList("valuePotential")}
          options={options.value.map((v) => ({ value: v, label: v }))}
        />
        <FacetPopover
          label="Complexity"
          selected={filters.complexity}
          onChange={setList("complexity")}
          options={options.complexity.map((v) => ({ value: v, label: v }))}
        />
        <FacetPopover
          label="Risk"
          selected={filters.riskLevel}
          onChange={setList("riskLevel")}
          options={options.risk.map((v) => ({ value: v, label: v }))}
        />
        <FacetPopover
          label="Target period"
          selected={filters.targetPeriods}
          onChange={setList("targetPeriods")}
          options={options.period.map((v) => ({ value: v, label: v }))}
        />
        <FacetPopover
          label="Function"
          selected={filters.functions}
          onChange={setList("functions")}
          options={options.fn.map((v) => ({ value: v, label: v }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={filters.studioOnly}
            onCheckedChange={(v) => set("studioOnly", v === true)}
            aria-label="Only entries with a Studio draft"
          />
          In Studio only
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={filters.unrankedOnly}
            onCheckedChange={(v) => set("unrankedOnly", v === true)}
            aria-label="Only unranked entries"
          />
          Unranked only
        </label>

        <span aria-live="polite" className="text-xs text-muted-foreground">
          {resultCount} of {entries.length} shown
        </span>

        {active > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => onChange(EMPTY_PORTFOLIO_FILTERS)}
          >
            Clear all filters
          </Button>
        )}
      </div>
    </div>
  );
}
