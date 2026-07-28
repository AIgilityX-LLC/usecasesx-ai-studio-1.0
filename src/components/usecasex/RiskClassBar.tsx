import { ShieldCheck, ShieldAlert, ShieldX, Shield } from "lucide-react";

const RISK_CLASSES: {
  slug: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  {
    slug: "Low",
    label: "Low risk",
    icon: ShieldCheck,
    tone: "data-[on=true]:border-emerald-500 data-[on=true]:bg-emerald-500/10 data-[on=true]:text-emerald-600",
  },
  {
    slug: "Medium",
    label: "Medium risk",
    icon: Shield,
    tone: "data-[on=true]:border-amber-500 data-[on=true]:bg-amber-500/10 data-[on=true]:text-amber-600",
  },
  {
    slug: "High",
    label: "High risk",
    icon: ShieldAlert,
    tone: "data-[on=true]:border-orange-500 data-[on=true]:bg-orange-500/10 data-[on=true]:text-orange-600",
  },
  {
    slug: "Critical",
    label: "Critical risk",
    icon: ShieldX,
    tone: "data-[on=true]:border-rose-500 data-[on=true]:bg-rose-500/10 data-[on=true]:text-rose-600",
  },
];

interface Props {
  selected: string[];
  onToggle: (slug: string) => void;
  governanceFirst: boolean;
  onGovernanceFirst: (v: boolean) => void;
}

/**
 * Governance-first risk-class browsing bar. Lets users immediately scope the
 * catalog by AI risk classification and surface the highest-risk use cases
 * first for governance review.
 */
export function RiskClassBar({ selected, onToggle, governanceFirst, onGovernanceFirst }: Props) {
  return (
    <div className="mb-5 rounded-xl border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
            Governance-first browsing
          </span>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            checked={governanceFirst}
            onChange={(e) => onGovernanceFirst(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Highest risk first
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {RISK_CLASSES.map((r) => {
          const on = selected.includes(r.slug);
          const Icon = r.icon;
          return (
            <button
              key={r.slug}
              data-on={on}
              onClick={() => onToggle(r.slug)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-secondary " +
                r.tone
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
