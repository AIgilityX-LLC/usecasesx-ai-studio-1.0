import type { ReactNode } from "react";

export function AnalyticsCard({ label, value, delta, hint, icon }: {
  label: string; value: string | number; delta?: string; hint?: string; icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <div className="mt-3 font-mono text-3xl font-bold text-foreground">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && <span className="font-bold text-primary">{delta}</span>}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
