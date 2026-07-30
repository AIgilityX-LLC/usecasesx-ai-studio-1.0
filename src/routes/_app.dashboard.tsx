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
