import type { ReactNode } from "react";

type HeroTone = "dark" | "light";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: HeroTone;
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * Shared page hero. `tone` selects a dark or light background so pages can
 * alternate banded backgrounds for visual rhythm. Uses semantic design tokens
 * so it stays theme-correct in both modes.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  tone = "dark",
  actions,
  children,
}: PageHeroProps) {
  const toneClass =
    tone === "dark"
      ? "dark bg-background text-foreground"
      : "bg-secondary/40 text-foreground";

  return (
    <section className={`${toneClass} border-b border-border`}>
      <div className="mx-auto w-full max-w-[1200px] px-6 py-14 md:py-20">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            {description}
          </p>
        ) : null}
        {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
