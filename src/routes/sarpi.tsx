import { createFileRoute, Link, useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/sarpi")({
  head: () => ({
    meta: [
      { title: "SARPI — Coming Soon" },
      {
        name: "description",
        content:
          "SARPI Readiness Tracking integration. The full workflow will be connected in the next release.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    source: typeof s.source === "string" ? s.source : undefined,
    use_case_id:
      typeof s.use_case_id === "string" ? s.use_case_id : undefined,
  }),
  component: SarpiStub,
});

function SarpiStub() {
  const { source, use_case_id } = useSearch({ from: "/sarpi" });
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
        SARPI
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Readiness tracking request received
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        SARPI integration event created. The full SARPI workflow will be
        connected in the next release.
      </p>
      {use_case_id && (
        <p className="mt-2 text-xs text-muted-foreground">
          Source: <span className="font-mono">{source ?? "-"}</span> · Use
          case: <span className="font-mono">{use_case_id}</span>
        </p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/ai-hub/usecasex/explore"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Back to Explore
        </Link>
        <Link
          to="/ai-hub/usecasex/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Open Pro Dashboard
        </Link>
      </div>
    </div>
  );
}
