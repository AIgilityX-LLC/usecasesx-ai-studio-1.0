import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/advisorx")({
  head: () => ({
    meta: [
      { title: "AdvisorX™ — Coming Soon" },
      {
        name: "description",
        content:
          "AdvisorX™ executive AI advisory. The full workflow will be connected in the next release.",
      },
    ],
  }),
  component: AdvisorXStub,
});

function AdvisorXStub() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-primary">AdvisorX™</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Executive guidance request received</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        AdvisorX™ integration event created. The full AdvisorX™ workflow will be connected in the next release.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/repository" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
          Back to Global Repository
        </Link>
        <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          Open Dashboard
        </Link>
      </div>
    </div>
  );
}
