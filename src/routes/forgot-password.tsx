import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/SiteShell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — UseCasesX™" },
      {
        name: "description",
        content: "Request a password reset link for your UseCasesX™ account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your account email and we'll send you a link to set a new password.
        </p>
        {sent ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-foreground">
              If an account exists for <span className="font-semibold">{email}</span>, a reset link
              is on its way. Check your inbox.
            </p>
            <Link
              to="/auth"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              placeholder="you@org.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/auth" className="font-semibold text-primary hover:underline">
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </SiteShell>
  );
}
