import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Persistent context strip so operators always know they left the customer app.
 */
export function PlatformAdminChrome({ className, title }: { className?: string; title?: string }) {
  return (
    <div
      className={cn("border-b border-primary/30 bg-primary/10 px-4 py-2.5 text-sm", className)}
      role="status"
      aria-label="Platform Administration context"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2">
        <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <nav aria-label="Platform administration breadcrumb" className="min-w-0 flex-1">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
            <li>
              <Link
                to="/platform-admin"
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                Platform Administration
              </Link>
            </li>
            {title ? (
              <>
                <li aria-hidden className="text-muted-foreground">
                  /
                </li>
                <li className="truncate font-medium text-foreground">{title}</li>
              </>
            ) : null}
          </ol>
        </nav>
        <p className="text-xs text-muted-foreground">
          AIgilityX operators only · separate from workspace admin
        </p>
        <Link
          to="/dashboard"
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          Back to UseCasesX
        </Link>
      </div>
    </div>
  );
}
