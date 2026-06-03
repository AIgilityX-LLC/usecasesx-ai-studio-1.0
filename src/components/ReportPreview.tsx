export function ReportPreview({ title, description, kind, onGenerate }: {
  title: string; description: string; kind: "lite" | "pro" | "portfolio"; onGenerate?: () => void;
}) {
  const badge = kind === "lite" ? "Lite PDF" : kind === "pro" ? "Pro Report" : "Portfolio Brief";
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-background p-5">
        <div className="flex h-full flex-col rounded-md border border-border bg-background p-4">
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">AIgilityX · UseCasesX™</div>
          <div className="mt-2 text-sm font-bold leading-tight text-foreground">{title}</div>
          <div className="mt-3 space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-1.5 rounded bg-secondary" style={{ width: `${88 - i * 9}%` }} />
            ))}
          </div>
          <div className="mt-auto grid grid-cols-3 gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-secondary" />
            ))}
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">{badge}</span>
        </div>
        <h3 className="mt-3 text-base font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {onGenerate && (
          <button onClick={onGenerate} className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110">
            Generate {badge} →
          </button>
        )}
      </div>
    </div>
  );
}
