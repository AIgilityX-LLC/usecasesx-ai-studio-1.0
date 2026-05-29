import { Link } from "@tanstack/react-router";
import type { MockUseCase, Level, Risk } from "@/lib/usecasex.mock";
import { PlatformBadge } from "./PlatformBadge";

function tone(kind: "value" | "complexity" | "risk" | "maturity" | "ttv", v: string): string {
  // Returns a soft semantic background+text combo for compact pills.
  const palette: Record<string, string> = {
    "value:High":         "bg-primary/10 text-primary",
    "value:Medium":       "bg-secondary text-foreground/80",
    "value:Low":          "bg-secondary text-muted-foreground",
    "complexity:Low":     "bg-primary/10 text-primary",
    "complexity:Medium":  "bg-secondary text-foreground/80",
    "complexity:High":    "bg-destructive/10 text-destructive",
    "risk:Low":           "bg-primary/10 text-primary",
    "risk:Medium":        "bg-secondary text-foreground/80",
    "risk:High":          "bg-destructive/10 text-destructive",
    "risk:Critical":      "bg-destructive text-destructive-foreground",
    "maturity:Beginner":     "bg-secondary text-muted-foreground",
    "maturity:Intermediate": "bg-secondary text-foreground/80",
    "maturity:Advanced":     "bg-primary/10 text-primary",
    "ttv:Short":  "bg-primary/10 text-primary",
    "ttv:Medium": "bg-secondary text-foreground/80",
    "ttv:Long":   "bg-secondary text-muted-foreground",
  };
  return palette[`${kind}:${v}`] ?? "bg-secondary text-foreground/80";
}

function Pill({ label, value, kind }: { label: string; value: string; kind: Parameters<typeof tone>[0] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className={"inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " + tone(kind, value)}>
        {value}
      </span>
    </div>
  );
}

export function MockUseCaseCard({
  c,
  onView,
}: {
  c: MockUseCase;
  onView?: (c: MockUseCase) => void;
}) {
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          {c.industry.name}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {c.aiType}
        </span>
      </div>

      {/* Title + summary */}
      <Link
        to="/ai-hub/usecasex/$slug"
        params={{ slug: c.slug }}
        onClick={() => onView?.(c)}
        className="block"
      >
        <h3 className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {c.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{c.summary}</p>
      </Link>

      {/* Business function row */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {c.businessFunction}
        </span>
        <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {c.objective}
        </span>
      </div>

      {/* Scoring grid */}
      <div className="mt-4 grid grid-cols-5 gap-2 border-t border-border pt-4">
        <Pill label="Value" value={c.valuePotential} kind="value" />
        <Pill label="Complexity" value={c.complexity} kind="complexity" />
        <Pill label="Risk" value={c.riskLevel as Risk} kind="risk" />
        <Pill label="Maturity" value={c.maturity} kind="maturity" />
        <Pill label="TTV" value={c.timeToValue} kind="ttv" />
      </div>

      {/* Platforms */}
      {c.platforms.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Recommended platforms
          </div>
          <div className="flex flex-wrap gap-1.5">
            {c.platforms.map((p) => (
              <span
                key={p.slug}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <Link
          to="/ai-hub/usecasex/$slug"
          params={{ slug: c.slug }}
          onClick={() => onView?.(c)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110"
        >
          View Use Case →
        </Link>
        <span className="text-[10px] font-medium text-muted-foreground">{c.industry.name}</span>
      </div>

      {/* Suppress unused-export warning for PlatformBadge import without using it */}
      <span className="sr-only">{PlatformBadge.name}</span>
    </article>
  );
}
