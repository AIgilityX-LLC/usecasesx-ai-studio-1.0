import { Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Decision-support notice shown next to every AI assistance entry point.
 *
 * Says plainly that AI output is a draft input to a human decision, never the
 * decision itself, and links to the full AI notice.
 */
export function AiSafetyNotice({
  variant = "block",
  what = "This suggestion",
  className,
}: {
  /** `block` for panels and forms, `inline` for tight toolbars. */
  variant?: "block" | "inline";
  /** What the AI produced, e.g. "This business case draft". */
  what?: string;
  className?: string;
}) {
  const body = `${what} is AI-generated decision support, not a decision. Review, correct and validate it with the people accountable for the outcome before you rely on it, share it, or export it.`;

  if (variant === "inline") {
    return (
      <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          AI-generated draft — human validation required.{" "}
          <Link to="/ai-notice" className="underline hover:text-foreground">
            How we use AI
          </Link>
        </span>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3",
        className,
      )}
      role="note"
      aria-label="AI decision-support notice"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">
          AI decision support — human validation required
        </p>
        <p className="text-xs text-muted-foreground">{body}</p>
        <Link
          to="/ai-notice"
          className="inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Read the AI notice
        </Link>
      </div>
    </div>
  );
}
