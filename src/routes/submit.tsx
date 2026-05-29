import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit a Use Case — AigilityX Hub" },
      {
        name: "description",
        content: "Contribute your AI deployment to the AigilityX use case repository.",
      },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">Submit a Use Case</h1>
        <p className="mt-4 text-muted-foreground">
          Contributions go through editorial review before publication. A guided submission
          wizard with AI-assisted intake is rolling out next.
        </p>

        <div className="mt-10 space-y-6 rounded-3xl border border-foreground/10 bg-white p-8">
          <p className="text-sm">
            To get notified when contributor access opens, sign in or create an account.
          </p>
          <div className="flex gap-3">
            <Link
              to="/auth"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:bg-primary"
            >
              Sign in / Sign up
            </Link>
            <Link
              to="/"
              className="rounded-full px-6 py-3 text-sm font-semibold text-foreground ring-1 ring-foreground/10 hover:bg-secondary"
            >
              Back to repository
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
