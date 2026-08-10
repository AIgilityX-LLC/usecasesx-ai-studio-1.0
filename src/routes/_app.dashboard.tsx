import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { ProDashboard } from "@/components/ProDashboard";
import { PlatformBanner } from "@/components/PlatformBanner";
import { ProductTour } from "@/components/ProductTour";

type Profile = {
  full_name: string | null;
  organization: string | null;
  industry: string | null;
  main_ai_interest: string | null;
};

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Your AI Opportunity Portfolio — UseCasesX™ Pro" },
      {
        name: "description",
        content: "Your saved AI use cases, scores, portfolios and executive reports.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [setupDone, setSetupDone] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      navigate({ to: "/pro", replace: true });
      return;
    }
    let active = true;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, organization, industry, main_ai_interest, profile_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      setProfile(p);
      setSetupDone(Boolean(p?.profile_completed));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [session, navigate]);

  // Signed-out visitors are redirected, but never left on a blank screen while
  // that navigation resolves.
  if (session === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Sign in to open your dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your shortlist, opportunities, drafts and scores live in your own workspace.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            Sign in
          </Link>
          <Link
            to="/repository"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
          >
            Browse the repository
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
        Loading your portfolio…
      </div>
    );
  }

  return (
    <>
      <PlatformBanner />
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          {!setupDone ? (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div>
                <p className="text-sm font-bold text-foreground">
                  Finish setting up your workspace
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Under a minute — it personalizes your repository, scoring and portfolio.
                </p>
              </div>
              <Link
                to="/onboarding"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
              >
                Continue setup →
              </Link>
            </div>
          ) : null}
          <ProDashboard profile={profile} />
        </div>
      </section>
      {setupDone ? <ProductTour /> : null}
    </>
  );
}
