import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Complete your profile — UseCasesX™ Pro" },
      { name: "description", content: "Tell us about you to personalize your AI Opportunity Portfolio." },
    ],
  }),
  component: ProfilePage,
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

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", organization: "", role: "",
    country: "", industry: "", main_ai_interest: "",
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/pro", replace: true }); return; }
      const { data: profile } = await supabase
        .from("profiles").select("*").eq("user_id", u.user.id).maybeSingle();
      if (profile?.profile_completed) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setForm((f) => ({
        ...f,
        email: profile?.email ?? u.user.email ?? "",
        full_name: profile?.full_name ?? "",
        organization: profile?.organization ?? "",
        role: profile?.role ?? "",
        country: profile?.country ?? "",
        industry: profile?.industry ?? "",
        main_ai_interest: profile?.main_ai_interest ?? "",
      }));
      setLoading(false);
    })();
  }, [navigate]);

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        user_id: u.user.id,
        ...form,
        profile_completed: true,
      }, { onConflict: "user_id" });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-muted-foreground">Loading your profile…</div>;
  }

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Step 2 · Profile</div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Complete your profile
        </h1>
        <p className="mt-3 text-muted-foreground">
          We use this to personalize use case recommendations and your AI Opportunity Portfolio.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
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
          <Field label="Industry" required>
            <select required value={form.industry} onChange={onChange("industry")} className={inputCls}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Main AI interest" required>
            <select required value={form.main_ai_interest} onChange={onChange("main_ai_interest")} className={inputCls}>
              <option value="">Select interest…</option>
              {INTERESTS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>

          {err ? <p className="text-sm text-destructive">{err}</p> : null}

          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "Saving…" : "Continue to my dashboard →"}
          </button>
        </form>
      </div>
    </section>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none";

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
