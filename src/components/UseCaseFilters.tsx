import { useState } from "react";

export interface FacetState {
  industries: string[];
  capabilities: string[];
  businessFunctions: string[];
  objectives: string[];
  processes: string[];

  maturity: string[];
  valuePotential: string[];
  complexity: string[];
  riskLevel: string[];
  timeToValue: string[];
  sectors: string[];
  tags: string[];
  segments: string[];
  priority: string[];
  roiRange: string[];
  deploymentModel: string[];
  securityClassification: string[];
}

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

export function UseCaseFilters({ tax, value, onChange, onClear, activeCount }: Props) {
  const toggle = (key: keyof FacetState, slug: string) => {
    const cur = (value[key] as string[] | undefined) ?? [];
    const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug];
    onChange({ [key]: next } as Partial<FacetState>);
  };
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Filters</h2>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>
      {tax.sectors && tax.sectors.length > 0 && (
        <Group
          title="Sector"
          options={tax.sectors}
          selected={value.sectors ?? []}
          onToggle={(s) => toggle("sectors", s)}
        />
      )}
      <Group
        title="Industry"
        options={tax.industries}
        selected={value.industries ?? []}
        onToggle={(s) => toggle("industries", s)}
      />
      <Group
        title="AI Type"
        options={tax.capabilities}
        selected={value.capabilities ?? []}
        onToggle={(s) => toggle("capabilities", s)}
      />
      <Group
        title="Business Function"
        options={tax.businessFunctions}
        selected={value.businessFunctions ?? []}
        onToggle={(s) => toggle("businessFunctions", s)}
      />
      <Group
        title="Business Objective"
        options={tax.objectives}
        selected={value.objectives ?? []}
        onToggle={(s) => toggle("objectives", s)}
      />
      <Group
        title="Maturity"
        options={[
          { slug: "Beginner", name: "Beginner" },
          { slug: "Intermediate", name: "Intermediate" },
          { slug: "Advanced", name: "Advanced" },
        ]}
        selected={value.maturity ?? []}
        onToggle={(s) => toggle("maturity", s)}
      />
      <Group
        title="Value Potential"
        options={[
          { slug: "Low", name: "Low" },
          { slug: "Medium", name: "Medium" },
          { slug: "High", name: "High" },
        ]}
        selected={value.valuePotential ?? []}
        onToggle={(s) => toggle("valuePotential", s)}
      />
      <Group
        title="Complexity"
        options={[
          { slug: "Low", name: "Low" },
          { slug: "Medium", name: "Medium" },
          { slug: "High", name: "High" },
        ]}
        selected={value.complexity ?? []}
        onToggle={(s) => toggle("complexity", s)}
      />
      <Group
        title="Risk Level"
        options={[
          { slug: "Low", name: "Low" },
          { slug: "Medium", name: "Medium" },
          { slug: "High", name: "High" },
          { slug: "Critical", name: "Critical" },
        ]}
        selected={value.riskLevel ?? []}
        onToggle={(s) => toggle("riskLevel", s)}
      />
      <Group
        title="Time to Value"
        options={[
          { slug: "Short", name: "Short (< 3 months)" },
          { slug: "Medium", name: "Medium (3–9 months)" },
          { slug: "Long", name: "Long (9+ months)" },
        ]}
        selected={value.timeToValue ?? []}
        onToggle={(s) => toggle("timeToValue", s)}
      />
      {tax.tags && tax.tags.length > 0 && (
        <Group
          title="Tags"
          options={tax.tags}
          selected={value.tags ?? []}
          onToggle={(s) => toggle("tags", s)}
        />
      )}
    </div>
  );
}

function Group({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { slug: string; name: string }[];
  selected: string[];
  onToggle: (s: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, 6);
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1">
        {visible.map((o) => {
          const active = selected.includes(o.slug);
          return (
            <button
              key={o.slug}
              onClick={() => onToggle(o.slug)}
              className={
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors " +
                (active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary")
              }
            >
              <span
                className={
                  "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border " +
                  (active ? "border-primary bg-primary" : "border-border")
                }
              >
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
      {options.length > 6 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          {expanded ? "Show less" : `Show all ${options.length} →`}
        </button>
      )}
    </div>
  );
}
