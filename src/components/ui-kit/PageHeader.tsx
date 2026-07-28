import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page title block. Every primary surface should open with this so
 * heading level, spacing and action placement stay identical across routes.
 *
 * Responsive contract: the title column may shrink and truncate, the action
 * slot never does (see `responsive-layout-patterns`).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border pb-5 sm:flex sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="truncate text-xl font-black tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
