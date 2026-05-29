import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const tiles = [
    { t: "Saved use cases", v: "0", d: "Start saving from the explore page." },
    { t: "Portfolios", v: "0", d: "Group cases by objective or theme." },
    { t: "Avg. score", v: "—", d: "Strategic · Value · Feasibility · Risk." },
    { t: "Reports generated", v: "0", d: "Board-ready PDF exports." },
  ];

  const pathways = [
    { t: "SARPI", d: "Track maturity & performance" },
    { t: "CyberX", d: "Govern AI risks" },
    { t: "AdvisorX", d: "Strategic decisions" },
    { t: "FlowX", d: "Execute workflows" },
    { t: "PrivacyX", d: "Data protection review" },
    { t: "AssureX", d: "Validate trust & assurance" },
  ];

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">UseCaseX™ Pro · Dashboard</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-2 text-muted-foreground">
              {profile?.industry ? `Industry: ${profile.industry} · ` : ""}
              {profile?.main_ai_interest ? `Focus: ${profile.main_ai_interest}` : ""}
            </p>
          </div>
          <Link to="/ai-hub/usecasex/explore"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110">
            Explore use cases →
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.t} className="rounded-xl border border-border bg-card p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.t}</div>
              <div className="mt-2 text-3xl font-bold text-foreground">{t.v}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-foreground">Your AI Opportunity Portfolio</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save use cases from the explore page, score them, and group them into portfolios.
            </p>
            <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-border bg-background p-10 text-center">
              <p className="text-sm text-muted-foreground">No saved use cases yet.</p>
              <Link to="/ai-hub/usecasex/explore"
                className="mt-3 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
                Browse the library →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-foreground">AIgilityX Pathways</h2>
            <p className="mt-1 text-sm text-muted-foreground">Trigger the next step in your AI journey.</p>
            <ul className="mt-4 divide-y divide-border">
              {pathways.map((p) => (
                <li key={p.t} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{p.t}</div>
                    <div className="text-xs text-muted-foreground">{p.d}</div>
                  </div>
                  <button className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
