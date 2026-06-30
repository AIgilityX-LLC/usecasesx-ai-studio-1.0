import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FacetState } from "@/components/UseCaseFilters";
import { ChevronDown } from "lucide-react";

interface Props {
  tax: {
    industries: { slug: string; name: string }[];
    capabilities: { slug: string; name: string }[];
    businessFunctions: { slug: string; name: string }[];
    objectives: { slug: string; name: string }[];
    sectors?: { slug: string; name: string }[];
    tags?: { slug: string; name: string }[];
  };
  value: Partial<FacetState>;
  onChange: (patch: Partial<FacetState>) => void;
  onClear: () => void;
  activeCount: number;
}

const LEVEL = (xs: string[]) => xs.map((s) => ({ slug: s, name: s }));

/**
 * Horizontal, sticky filter bar. Each facet renders as a dropdown popover so
 * the full set of filters lives along the top of the page instead of a left rail.
 */
export function HorizontalFilters({ tax, value, onChange, onClear, activeCount }: Props) {
  const toggle = (key: keyof FacetState, slug: string) => {
    const cur = (value[key] as string[] | undefined) ?? [];
    const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug];
    onChange({ [key]: next } as Partial<FacetState>);
  };

  const facets: { key: keyof FacetState; label: string; options: { slug: string; name: string }[] }[] = [
    ...(tax.sectors && tax.sectors.length ? [{ key: "sectors" as const, label: "Sector", options: tax.sectors }] : []),
    { key: "industries", label: "Industry", options: tax.industries },
    { key: "capabilities", label: "AI Type", options: tax.capabilities },
    { key: "businessFunctions", label: "Business Function", options: tax.businessFunctions },
    { key: "objectives", label: "Objective", options: tax.objectives },
    { key: "maturity", label: "Maturity", options: LEVEL(["Beginner", "Intermediate", "Advanced"]) },
    { key: "valuePotential", label: "Value", options: LEVEL(["Low", "Medium", "High"]) },
    { key: "complexity", label: "Complexity", options: LEVEL(["Low", "Medium", "High"]) },
    { key: "riskLevel", label: "Risk", options: LEVEL(["Low", "Medium", "High", "Critical"]) },
    { key: "timeToValue", label: "Time to Value", options: [
      { slug: "Short", name: "Short (< 3 months)" },
      { slug: "Medium", name: "Medium (3–9 months)" },
      { slug: "Long", name: "Long (9+ months)" },
    ] },
    ...(tax.tags && tax.tags.length ? [{ key: "tags" as const, label: "Tags", options: tax.tags }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Filters
      </span>
      {facets.map((f) => {
        const selected = (value[f.key] as string[] | undefined) ?? [];
        return (
          <Popover key={f.key}>
            <PopoverTrigger asChild>
              <button
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors " +
                  (selected.length
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground/80 hover:bg-secondary")
                }
              >
                {f.label}
                {selected.length > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {selected.length}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-80 w-64 overflow-y-auto p-2">
              <div className="space-y-0.5">
                <button
                  onClick={() => onChange({ [f.key]: [] } as Partial<FacetState>)}
                  className={
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold transition-colors " +
                    (selected.length === 0 ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary")
                  }
                >
                  <span className={"grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border " + (selected.length === 0 ? "border-primary bg-primary" : "border-border")}>
                    {selected.length === 0 && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-primary-foreground">
                        <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">All</span>
                </button>
                {f.options.map((o) => {
                  const active = selected.includes(o.slug);
                  return (
                    <button
                      key={o.slug}
                      onClick={() => toggle(f.key, o.slug)}
                      className={
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors " +
                        (active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary")
                      }
                    >
                      <span className={"grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border " + (active ? "border-primary bg-primary" : "border-border")}>
                        {active && (
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-primary-foreground">
                            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1">{o.name}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="ml-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}