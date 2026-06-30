import { createFileRoute, Link, useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/cyberx/c3g/intake")({
  head: () => ({
    meta: [
      { title: "CyberX C3G Intake — Coming Soon" },
      {
        name: "description",
        content:
          "CyberX C3G governance intake. The full workflow will be connected in the next release.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    source: typeof s.source === "string" ? s.source : undefined,
    use_case_id:
      typeof s.use_case_id === "string" ? s.use_case_id : undefined,
  }),
  component: CyberXIntakeStub,
});

function CyberXIntakeStub() {
  const { source, use_case_id } = useSearch({ from: "/_app/cyberx/c3g/intake" });
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
        CyberX · C3G
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Governance review request received
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        CyberX C3G governance event created. The full C3G intake workflow will
        be connected in the next release.
      </p>
      {use_case_id && (
        <p className="mt-2 text-xs text-muted-foreground">
          Source: <span className="font-mono">{source ?? "-"}</span> · Use
          case: <span className="font-mono">{use_case_id}</span>
        </p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/repository"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Back to Explore
        </Link>
        <Link
          to="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Open Pro Dashboard
        </Link>
      </div>
    </div>
  );
}
