import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

/**
 * Single source of truth for small status pills (draft / scored / archived,
 * plan badges, risk classes). Tones map to semantic tokens only — never
 * hardcode colours at the call site.
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-secondary text-secondary-foreground ring-border",
  success: "bg-primary/10 text-primary ring-primary/30",
  warning: "bg-accent/15 text-accent-foreground ring-accent/40",
  danger: "bg-destructive/10 text-destructive ring-destructive/30",
  accent: "bg-primary/15 text-primary ring-primary/40",
};

export function StatusChip({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
