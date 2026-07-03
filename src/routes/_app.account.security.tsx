import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

export const Route = createFileRoute("/_app/account/security")({
  component: SecurityPage,
});

const inputCls = "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none";

function SecurityPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const [user, setUser] = useState<User | null>(null);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdInfo, setPwdInfo] = useState<string | null>(null);

  const [verifyInfo, setVerifyInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate({ to: "/pro", replace: true }); return; }
    setUser(session.user);
  }, [session, navigate]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr(null); setPwdInfo(null);
    if (pwd.length < 8) { setPwdErr("Password must be at least 8 characters."); return; }
    if (pwd !== pwd2) { setPwdErr("Passwords do not match."); return; }
    setPwdSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setPwd(""); setPwd2("");
      setPwdInfo("Password changed successfully.");
    } catch (e) {
      setPwdErr(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setPwdSaving(false);
    }
  };

  const resendVerification = async () => {
    setVerifyInfo(null);
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: window.location.origin },
    });
    setVerifyInfo(error ? error.message : "Verification email sent. Check your inbox.");
  };

  const signOutThisDevice = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/", replace: true });
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/", replace: true });
  };

  if (!user) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  const emailVerified = !!user.email_confirmed_at;
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—";
  const provider = (user.app_metadata?.provider as string) || "email";

  return (
    <section className="bg-secondary/40">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
        {/* Email verification */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">Email verification</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              emailVerified ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
            }`}>
              {emailVerified ? "Verified" : "Unverified"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
          {!emailVerified && (
            <div className="mt-4">
              <button onClick={resendVerification}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
                Resend verification email
              </button>
            </div>
          )}
          {verifyInfo ? <p className="mt-3 text-sm text-primary">{verifyInfo}</p> : null}
        </div>

        {/* Password */}
        <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-bold text-foreground">Change password</h2>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-foreground">New password</span>
            <input type="password" minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="8+ characters" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-foreground">Confirm new password</span>
            <input type="password" minLength={8} value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Repeat password" className={inputCls} />
          </label>
          {pwdErr ? <p className="text-sm text-destructive">{pwdErr}</p> : null}
          {pwdInfo ? <p className="text-sm text-primary">{pwdInfo}</p> : null}
          <button type="submit" disabled={pwdSaving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {pwdSaving ? "Updating…" : "Update password"}
          </button>
        </form>

        {/* Sessions */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-bold text-foreground">Login sessions</h2>
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">This device · current session</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Signed in via {provider} · last sign-in {lastSignIn}
                </div>
              </div>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">Active</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Revoking all sessions signs you out on every device where you're logged in.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={signOutThisDevice}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
              Sign out this device
            </button>
            <button onClick={signOutEverywhere}
              className="rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
              Sign out of all devices
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}