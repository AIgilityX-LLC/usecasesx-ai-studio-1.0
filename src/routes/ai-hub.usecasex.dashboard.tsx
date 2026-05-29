import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProDashboard } from "@/components/ProDashboard";

type Profile = {
  full_name: string | null;
  organization: string | null;
  industry: string | null;
  main_ai_interest: string | null;
};

export const Route = createFileRoute("/ai-hub/usecasex/dashboard")({
  head: () => ({
    meta: [
      { title: "Your AI Opportunity Portfolio — UseCaseX™ Pro" },
      { name: "description", content: "Your saved AI use cases, scores, portfolios and executive reports." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/ai-hub/usecasex/pro", replace: true }); return; }
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, organization, industry, main_ai_interest, profile_completed")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!p?.profile_completed) {
        navigate({ to: "/ai-hub/usecasex/profile", replace: true });
        return;
      }
      setProfile(p);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">Loading your portfolio…</div>;
  }

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <ProDashboard profile={profile} />
      </div>
    </section>
  );
}
