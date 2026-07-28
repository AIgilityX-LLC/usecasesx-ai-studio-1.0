import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/SiteShell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — UseCasesX™" },
      { name: "description", content: "Choose a new password for your UseCasesX™ account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The recovery link establishes a session and fires PASSWORD_RECOVERY.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "INITIAL_SESSION" && session) || session) {
        setReady(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pwd !== pwd2) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold tracking-tight">Set a new password</h1>
        {done ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-foreground">
              Password updated. Redirecting you to your dashboard…
            </p>
          </div>
        ) : !ready ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Waiting for a valid password reset link. Open this page from the link in your reset
              email.
            </p>
            <Link
              to="/forgot-password"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <input
              type="password"
              required
              minLength={8}
              placeholder="New password (8+ characters)"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Confirm new password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </SiteShell>
  );
}
