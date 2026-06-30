import { Gauge, Layers, Timer } from "lucide-react";

export interface OutcomesValue {
  valuePotential: string[];
  complexity: string[];
  timeToValue: string[];
}

type Group = {
  key: keyof OutcomesValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { slug: string; label: string }[];
};

const GROUPS: Group[] = [
  {
    key: "valuePotential",
    label: "Value",
    icon: Gauge,
    options: [
      { slug: "Low", label: "Low" },
      { slug: "Medium", label: "Medium" },
      { slug: "High", label: "High" },
    ],
  },
  {
    key: "complexity",
    label: "Complexity",
    icon: Layers,
    options: [
      { slug: "Low", label: "Low" },
      { slug: "Medium", label: "Medium" },
      { slug: "High", label: "High" },
    ],
  },
  {
    key: "timeToValue",
    label: "Time to value",
    icon: Timer,
    options: [
      { slug: "Short", label: "Short" },
      { slug: "Medium", label: "Medium" },
      { slug: "Long", label: "Long" },
    ],
  },
];

interface Props {
  value: OutcomesValue;
  onToggle: (key: keyof OutcomesValue, slug: string) => void;
}

/**
 * Quick structured-outcomes filter bar. Lets users narrow the catalog by
 * Value, Complexity and Time-to-Value before opening details. Risk class is
 * handled by the dedicated RiskClassBar; all share the same URL search state.
 */
export function OutcomesFilterBar({ value, onToggle }: Props) {
  return (
    <div className="mb-5 rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
          Structured outcomes
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const selected = value[g.key] ?? [];
          return (
            <div key={g.key} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {g.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {g.options.map((o) => {
                  const on = selected.includes(o.slug);
                  return (
                    <button
                      key={o.slug}
                      onClick={() => onToggle(g.key, o.slug)}
                      className={
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition " +
                        (on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground/80 hover:bg-secondary")
                      }
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}