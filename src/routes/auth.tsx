import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/SiteShell";
import { seedDemoAccounts, DEMO_ACCOUNTS } from "@/lib/demo-accounts.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — UseCasesX™" },
      {
        name: "description",
        content: "Sign in to UseCasesX™ — Global AI Use Cases Repository & Development Studio.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const seed = useServerFn(seedDemoAccounts);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedState, setSeedState] = useState<"idle" | "seeding" | "ready" | "error">("idle");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const ensureSeeded = async () => {
    if (seedState === "ready" || seedState === "seeding") return;
    setSeedState("seeding");
    try {
      await seed();
      setSeedState("ready");
    } catch (e) {
      console.error(e);
      setSeedState("error");
    }
  };

  const signInDemo = async (em: string, pw: string) => {
    setError(null);
    setLoading(true);
    await ensureSeeded();
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    if (error) setError(error.message);
    setLoading(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2">
        <section>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            UseCasesX™ — Global AI Use Cases Repository &amp; Development Studio.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              placeholder="you@org.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signin" && (
            <p className="mt-3 text-center text-sm">
              <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
                Forgot your password?
              </Link>
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold text-primary hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/">← Back to UseCasesX™</Link>
          </p>
        </section>

        <aside className="rounded-2xl border border-primary/30 bg-card p-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Demo accounts
          </div>
          <h2 className="mt-1 text-lg font-bold">Try UseCasesX™ instantly</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            All demo accounts use the password{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">Demo@123</code>. One click
            signs you in with the matching role and plan tier.
          </p>
          {seedState === "error" && (
            <p className="mt-2 text-xs text-destructive">
              Couldn't provision demo accounts. Check server logs.
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li
                key={a.email}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{a.label}</span>
                    {a.role && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        {a.role}
                      </span>
                    )}
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground">
                      {a.plan_type}
                    </span>
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {a.email}
                  </div>
                </div>
                <button
                  onClick={() => signInDemo(a.email, a.password)}
                  disabled={loading}
                  className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  Sign in
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </SiteShell>
  );
}
