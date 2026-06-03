import { Link } from "@tanstack/react-router";

export function MissingDataFallback({
  title = "Use case catalog is temporarily unavailable",
  reason,
  backTo = "/",
  backLabel = "Back to UseCasesX™",
}: {
  title?: string;
  reason?: string;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {reason ?? "We couldn't load the use case catalog right now. Please try again in a moment."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Reload
        </button>
        <Link
          to={backTo as "/"}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
