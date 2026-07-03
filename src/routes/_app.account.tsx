import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { PageHero } from "@/components/usecasex/PageHero";

export const Route = createFileRoute("/_app/account")({
  head: () => ({
    meta: [
      { title: "Account Settings — UseCasesX™" },
      { name: "description", content: "Update your profile, change your password, and manage your account." },
    ],
  }),
  component: AccountPage,
});

const INDUSTRIES = [
  "Defense & National Security", "Public Sector & Government", "Healthcare & Life Sciences",
  "Banking & Capital Markets", "Insurance", "Energy & Utilities", "Manufacturing & Industrial",
  "Telecommunications", "Retail & Consumer", "Transportation & Logistics", "Education",
  "Professional Services", "Technology & Software", "Media & Entertainment", "Real Estate",
  "Agriculture & Food", "Travel & Hospitality", "Finance & Insurance",
];

const INTERESTS = [
  "Productivity", "Automation", "AI Strategy", "AI Governance",
  "Agentic AI", "AI ROI", "Cybersecurity", "Training", "Sovereign AI",
];

const ROLES = ["Executive / C-Suite", "Director / VP", "Manager", "Practitioner", "Advisor / Consultant", "Researcher", "Student", "Other"];

const inputCls = "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none";

function AccountPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", organization: "", role: "",
    country: "", industry: "", main_ai_interest: "",
  });

  // Password change state
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdInfo, setPwdInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate({ to: "/pro", replace: true }); return; }
    let active = true;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!active) return;
      setForm((f) => ({
        ...f,
        email: profile?.email ?? session.user.email ?? "",
        full_name: profile?.full_name ?? "",
        organization: profile?.organization ?? "",
        role: profile?.role ?? "",
        country: profile?.country ?? "",
        industry: profile?.industry ?? "",
        main_ai_interest: profile?.main_ai_interest ?? "",
      }));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [session, navigate]);

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setInfo(null); setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        user_id: u.user.id,
        ...form,
        profile_completed: true,
      }, { onConflict: "user_id" });
      if (error) throw error;
      setInfo("Profile updated.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

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

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-muted-foreground">Loading your account…</div>;
  }

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Account"
        title="Account settings"
        description="Update your profile, change your password, and manage your session."
      />
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-2xl space-y-8 px-6 py-16">
          {/* Profile */}
          <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-bold text-foreground">Profile</h2>
            <Field label="Full name" required>
              <input required value={form.full_name} onChange={onChange("full_name")} className={inputCls} />
            </Field>
            <Field label="Email" required>
              <input type="email" required value={form.email} onChange={onChange("email")} className={inputCls} />
            </Field>
            <Field label="Organization">
              <input value={form.organization} onChange={onChange("organization")} className={inputCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">
                <select value={form.role} onChange={onChange("role")} className={inputCls}>
                  <option value="">Select…</option>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Country">
                <input value={form.country} onChange={onChange("country")} className={inputCls} />
              </Field>
            </div>
            <Field label="Industry">
              <select value={form.industry} onChange={onChange("industry")} className={inputCls}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Main AI interest">
              <select value={form.main_ai_interest} onChange={onChange("main_ai_interest")} className={inputCls}>
                <option value="">Select interest…</option>
                {INTERESTS.map((i) => <option key={i}>{i}</option>)}
              </select>
            </Field>
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            {info ? <p className="text-sm text-primary">{info}</p> : null}
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>

          {/* Password */}
          <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-bold text-foreground">Change password</h2>
            <Field label="New password">
              <input type="password" minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="8+ characters" className={inputCls} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" minLength={8} value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Repeat password" className={inputCls} />
            </Field>
            {pwdErr ? <p className="text-sm text-destructive">{pwdErr}</p> : null}
            {pwdInfo ? <p className="text-sm text-primary">{pwdInfo}</p> : null}
            <button type="submit" disabled={pwdSaving}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {pwdSaving ? "Updating…" : "Update password"}
            </button>
          </form>

          {/* Session */}
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-bold text-foreground">Session</h2>
            <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
            <button onClick={signOut}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary">
              Sign out
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-foreground">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}