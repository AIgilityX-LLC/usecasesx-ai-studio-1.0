import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Canonical error surface. Pairs with `EmptyState` and `LoadingSkeleton` so
 * every data-backed page can express loading / empty / error identically.
 * Never render raw provider errors here — pass a user-safe message.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this view. Try again in a moment.",
  onRetry,
  action,
  className,
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {(onRetry || action) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              <span>Try again</span>
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
