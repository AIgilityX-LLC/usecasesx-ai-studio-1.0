export function ScoreCard({
  label,
  score,
  max = 100,
  hint,
}: {
  label: string;
  score: number;
  max?: number;
  hint?: string;
}) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const tone =
    score >= 75 ? "text-primary" : score >= 50 ? "text-accent-foreground" : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className={"font-mono text-2xl font-bold " + tone}>
          {score}
          <span className="text-sm text-muted-foreground">/{max}</span>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
