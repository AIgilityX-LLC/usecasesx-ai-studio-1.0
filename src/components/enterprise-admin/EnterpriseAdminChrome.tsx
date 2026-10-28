import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Persistent strip — tenant administration, distinct from Platform Admin. */
export function EnterpriseAdminChrome({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={cn("border-b border-border bg-muted/40 px-4 py-2.5 text-sm", className)}
      role="status"
      aria-label="Enterprise Administration context"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <nav aria-label="Enterprise administration breadcrumb" className="min-w-0 flex-1">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
            <li>
              <Link
                to="/enterprise-admin"
                className="font-semibold text-foreground underline-offset-2 hover:underline"
              >
                Enterprise Administration
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
          Organization owners &amp; admins · not platform operations
        </p>
        <Link
          to="/dashboard"
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          Back to workspace
        </Link>
      </div>
    </div>
  );
}
