export function PlatformBadge({ name, category, color = "navy" }: { name: string; category?: string; color?: "navy" | "blue" | "cyan" }) {
  const ring = color === "cyan" ? "ring-accent/40" : color === "blue" ? "ring-primary/40" : "ring-foreground/15";
  const dot = color === "cyan" ? "bg-accent" : color === "blue" ? "bg-primary" : "bg-foreground/70";
  return (
    <div className={"flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 ring-1 " + ring}>
      <span className={"mt-1.5 h-2 w-2 rounded-full " + dot} />
      <div>
        <div className="text-sm font-bold text-foreground">{name}</div>
        {category && <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{category}</div>}
      </div>
    </div>
  );
}
