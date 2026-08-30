import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/SiteShell";

/** `redirect` + `intent` let a signed-out action resume after sign-in. */
const authSearchSchema = z.object({
  redirect: fallback(z.string().optional(), undefined),
  intent: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(authSearchSchema),
  head: () => ({
    meta: [
      { title: "Sign in — UseCasesX™" },
      {
        name: "description",
        content: "Sign in to UseCasesX™ — Global AI Use Cases Repository & Development Studio.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, intent } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) return;
      // Only same-origin in-app paths are honoured, never an external URL.
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      if (safeRedirect) {
        navigate({
          to: safeRedirect,
          search: intent ? ({ intent } as never) : undefined,
          replace: true,
        });
        return;
      }
      // /onboarding forwards straight to /dashboard when setup is already done.
      navigate({ to: "/onboarding", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, redirect, intent]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formErrors = validateSignInForm(email, password);
    if (mode === "signup") {
      const policy = validatePlatformPassword(password, { email });
      if (!policy.ok) formErrors.push(...policy.errors);
    }
    if (formErrors.length > 0) {
      setError(formErrors.join(" "));
      return;
    }
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
      setError(describeSignInError(err));
    } finally {
      setLoading(false);
    }
  };


  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-6 py-16">
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
      </div>
    </SiteShell>
  );
}
