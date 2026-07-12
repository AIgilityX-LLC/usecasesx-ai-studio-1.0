import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RequirePlan } from "@/components/RequirePlan";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackCTAEvent } from "@/lib/usecasex.tracking";

export const Route = createFileRoute("/_app/pro")({
  head: () => ({
    meta: [
      { title: "UseCasesX™ Pro — Free with Registration" },
      { name: "description", content: "Build Your AI Opportunity Portfolio. Save, score, prioritize, and report AI use cases — free with registration." },
    ],
  }),
  component: () => (<RequirePlan min="pro" feature="Pro workspace"><ProPage /></RequirePlan>),
});

const STEPS = [
  {
    n: "01",
    t: "Save",
    d: "Bookmark high-potential use cases from the repository into your private workspace.",
    icon: "🔖",
  },
  {
    n: "02",
    t: "Score",
    d: "Rate each on Strategic · Value · Feasibility · Risk · Readiness · TTV — get a composite AIgilityX score.",
    icon: "📊",
  },
  {
    n: "03",
    t: "Export board-ready PDF",
    d: "One click: portfolio KPIs, top prioritized cases, risk posture and next actions — ready to present.",
    icon: "📄",
  },
];

const EXTRAS = [
  "Add notes & priority",
  "Build themed AI portfolios",
  "Trigger SARPI · CyberX · AdvisorX pathways",
  "Free with registration — no credit card",
];


async function routeAfterAuth(navigate: ReturnType<typeof useNavigate>) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.profile_completed) {
    navigate({ to: "/dashboard", replace: true });
  } else {
    navigate({ to: "/profile", replace: true });
  }
}

function ProPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void routeAfterAuth(navigate);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        trackCTAEvent("pro_signin", { source_page: "usecasex-pro" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/profile` },
        });
        if (error) throw error;
        setInfo("Check your inbox to confirm your email, then sign in to continue.");
        trackCTAEvent("pro_signup", { source_page: "usecasex-pro" });
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/profile` },
        });
        if (error) throw error;
        setInfo("Magic link sent. Check your inbox to continue.");
        trackCTAEvent("pro_magic_link", { source_page: "usecasex-pro" });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          {/* Left */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">UseCasesX™ Pro · Free with registration</div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Build Your <span className="text-primary">AI Opportunity Portfolio</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Save, score, prioritize, and report AI use cases — free with registration.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.t} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">✓</div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{f.t}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              UseCasesX Pro is free with registration. By creating an account you agree to our terms and privacy policy.
            </p>
          </div>

          {/* Right — Auth card */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex gap-1 rounded-lg bg-secondary p-1 text-xs font-semibold">
                {(["signup", "signin", "magic"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setErr(null); setInfo(null); }}
                    className={`flex-1 rounded-md px-3 py-2 transition ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {m === "signup" ? "Create account" : m === "signin" ? "Sign in" : "Magic link"}
                  </button>
                ))}
              </div>

              <h2 className="mt-5 text-xl font-bold text-foreground">
                {mode === "signup" ? "Create your free Pro account" : mode === "signin" ? "Welcome back" : "Email me a magic link"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signup"
                  ? "60 seconds. No credit card."
                  : mode === "signin"
                  ? "Access your saved use cases and portfolios."
                  : "We'll send a one-tap sign-in link."}
              </p>

              <form onSubmit={submit} className="mt-5 space-y-3">
                <input
                  type="email"
                  required
                  placeholder="you@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
                {mode !== "magic" ? (
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Password (8+ characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  />
                ) : null}
                {err ? <p className="text-sm text-destructive">{err}</p> : null}
                {info ? <p className="text-sm text-primary">{info}</p> : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? "…" : mode === "signup" ? "Create my free Pro account →" : mode === "signin" ? "Sign in →" : "Send magic link →"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                <Link to="/repository" className="hover:text-foreground">← Browse use cases first</Link>
              </p>
              {mode === "signin" && (
                <p className="mt-2 text-center text-xs">
                  <Link to="/forgot-password" className="font-semibold text-primary hover:underline">Forgot your password?</Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
