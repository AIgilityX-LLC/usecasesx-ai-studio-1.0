import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { ProDashboard } from "@/components/ProDashboard";
import { PlatformBanner } from "@/components/PlatformBanner";

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
      if (!p?.profile_completed) {
        navigate({ to: "/profile", replace: true });
        return;
      }
      setProfile(p);
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
          <ProDashboard profile={profile} />
        </div>
      </section>
    </>
  );
}
