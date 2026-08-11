import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/account/")({
  head: () => privateHead("Account"),
  component: AccountProfilePage,
});

const INDUSTRIES = [
  "Defense & National Security",
  "Public Sector & Government",
  "Healthcare & Life Sciences",
  "Banking & Capital Markets",
  "Insurance",
  "Energy & Utilities",
  "Manufacturing & Industrial",
  "Telecommunications",
  "Retail & Consumer",
  "Transportation & Logistics",
  "Education",
  "Professional Services",
  "Technology & Software",
  "Media & Entertainment",
  "Real Estate",
  "Agriculture & Food",
  "Travel & Hospitality",
  "Finance & Insurance",
];

const INTERESTS = [
  "Productivity",
  "Automation",
  "AI Strategy",
  "AI Governance",
  "Agentic AI",
  "AI ROI",
  "Cybersecurity",
  "Training",
  "Sovereign AI",
];

const ROLES = [
  "Executive / C-Suite",
  "Director / VP",
  "Manager",
  "Practitioner",
  "Advisor / Consultant",
  "Researcher",
  "Student",
  "Other",
];

const inputCls =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none";
const AVATAR_POLICY = BUCKET_POLICIES[AVATAR_BUCKET];
const ACCEPTED = AVATAR_POLICY.mimeTypes;

function AccountProfilePage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    organization: "",
    role: "",
    country: "",
    industry: "",
    main_ai_interest: "",
  });

  // avatar
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      navigate({ to: "/pro", replace: true });
      return;
    }
    let active = true;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
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
      setAvatarPath(profile?.avatar_url ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [session, navigate]);

  // Resolve a signed URL for the stored avatar path (private bucket).
  useEffect(() => {
    if (!avatarPath) {
      setAvatarUrl(null);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(avatarPath, signedUrlTtl(AVATAR_BUCKET));
      if (active) setAvatarUrl(data?.signedUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [avatarPath]);

  const onChange =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const decision = validateUpload(AVATAR_BUCKET, {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!decision.allowed) {
      setAvatarErr(decision.reason);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setAvatarErr("Not signed in");
      return;
    }
    setUploading(true);
    // instant local preview
    setAvatarUrl(URL.createObjectURL(file));
    try {
      const path = `${u.user.id}/avatar.${extensionOf(file.name) || "png"}`;
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("user_id", u.user.id);
      if (dbErr) throw dbErr;
      setAvatarPath(path);
      setInfo("Avatar updated.");
    } catch (e) {
      setAvatarErr(e instanceof Error ? e.message : "Could not upload avatar");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    setAvatarErr(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !avatarPath) return;
    setUploading(true);
    try {
      await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
      await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", u.user.id);
      setAvatarPath(null);
      setAvatarUrl(null);
    } catch (e) {
      setAvatarErr(e instanceof Error ? e.message : "Could not remove avatar");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: u.user.id,
          ...form,
          profile_completed: true,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      setInfo("Profile updated.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.full_name || form.email || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-muted-foreground">
        Loading your account…
      </div>
    );
  }

  return (
    <section className="bg-secondary/40">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
        {/* Avatar */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-bold text-foreground">Profile photo</h2>
          <div className="mt-4 flex items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 ring-1 ring-primary/40">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-black text-primary">{initials}</span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
                </button>
                {avatarPath && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={uploading}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or GIF. Max 2 MB.</p>
              {avatarErr ? <p className="text-xs text-destructive">{avatarErr}</p> : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={onPickAvatar}
              className="hidden"
            />
          </div>
        </div>

        {/* Profile */}
        <form
          onSubmit={saveProfile}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
        >
          <h2 className="text-lg font-bold text-foreground">Profile</h2>
          <Field label="Full name" required>
            <input
              required
              value={form.full_name}
              onChange={onChange("full_name")}
              className={inputCls}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              required
              value={form.email}
              onChange={onChange("email")}
              className={inputCls}
            />
          </Field>
          <Field label="Organization">
            <input
              value={form.organization}
              onChange={onChange("organization")}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <select value={form.role} onChange={onChange("role")} className={inputCls}>
                <option value="">Select…</option>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Country">
              <input value={form.country} onChange={onChange("country")} className={inputCls} />
            </Field>
          </div>
          <Field label="Industry">
            <select value={form.industry} onChange={onChange("industry")} className={inputCls}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Main AI interest">
            <select
              value={form.main_ai_interest}
              onChange={onChange("main_ai_interest")}
              className={inputCls}
            >
              <option value="">Select interest…</option>
              {INTERESTS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          {info ? <p className="text-sm text-primary">{info}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
