import { createFileRoute, Link } from "@tanstack/react-router";
import { CTAButtonGroup } from "@/components/CTAButtonGroup";

export const Route = createFileRoute("/ai-hub/usecasex/pro")({
  head: () => ({
    meta: [
      { title: "Get UseCaseX™ Pro — Free with Registration" },
      { name: "description", content: "Save use cases, score them with the AIgilityX engine, and build AI Opportunity Portfolios. Pro is free with registration." },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">UseCaseX™ Pro</div>
        <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Turn the repository into <span className="text-primary">your AI roadmap</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Save use cases, score them with the AIgilityX engine, build AI Opportunity Portfolios, and generate board-ready reports.
          <span className="font-semibold text-foreground"> Pro is free with registration.</span>
        </p>
        <div className="mt-6">
          <CTAButtonGroup ctas={[
            { label: "Create your free Pro account →", to: "/auth" },
            { label: "Browse first", to: "/ai-hub/usecasex/explore", variant: "secondary" },
          ]} />
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Save use cases", d: "Bookmark high-potential use cases to a private workspace." },
            { t: "Score with AIgilityX", d: "Strategic · Value · Feasibility · Risk · Readiness · TTV." },
            { t: "Build portfolios", d: "Group use cases into AI Opportunity Portfolios per objective." },
            { t: "Export Pro reports", d: "Board-ready PDFs with KPIs, scoring, and roadmap." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">✓</div>
              <h3 className="mt-3 text-base font-bold text-foreground">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8">
          <div className="grid items-center gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">Ready in 60 seconds — no credit card.</h2>
              <p className="mt-1 text-muted-foreground">Sign up with email or Google. Your workspace, saved cases and portfolios stay private to your account.</p>
            </div>
            <Link to="/auth" className="rounded-md bg-primary px-5 py-3 text-center text-sm font-bold text-primary-foreground hover:brightness-110">
              Create my free Pro account →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
