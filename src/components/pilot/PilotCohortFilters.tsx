/**
 * Search controls for the pilot cohort table and its per-seat audit timelines.
 * Presentation only — filtering itself lives in pilot.cohort-filters.ts.
 */

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANY,
  EMPTY_COHORT_FILTERS,
  hasActiveCohortFilters,
  type CohortFilterState,
} from "@/lib/pilot/pilot.cohort-filters";

export function PilotCohortFilters({
  filters,
  onChange,
  sectors,
  countries,
  shown,
  total,
}: {
  filters: CohortFilterState;
  onChange: (next: CohortFilterState) => void;
  sectors: readonly string[];
  countries: readonly string[];
  shown: number;
  total: number;
}) {
  const set = <K extends keyof CohortFilterState>(key: K, value: CohortFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="cohort-query">Search participants</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="cohort-query"
              className="pl-8"
              value={filters.query}
              onChange={(event) => set("query", event.target.value)}
              placeholder="Name, email or organisation"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="cohort-sector">Sector</Label>
          <Select value={filters.sector} onValueChange={(value) => set("sector", value)}>
            <SelectTrigger id="cohort-sector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any sector</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="cohort-country">Country</Label>
          <Select value={filters.country} onValueChange={(value) => set("country", value)}>
            <SelectTrigger id="cohort-country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any country</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="cohort-from">Invited from</Label>
            <Input
              id="cohort-from"
              type="date"
              value={filters.from}
              onChange={(event) => set("from", event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cohort-to">Invited to</Label>
            <Input
              id="cohort-to"
              type="date"
              value={filters.to}
              onChange={(event) => set("to", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" role="status">
          Showing {shown} of {total} seat{total === 1 ? "" : "s"}. Sector and country come from the
          participant&apos;s onboarding intake.
        </p>
        {hasActiveCohortFilters(filters) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onChange(EMPTY_COHORT_FILTERS)}
          >
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
