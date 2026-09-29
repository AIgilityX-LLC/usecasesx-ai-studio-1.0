import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleSwitcher, useLocale } from "@/components/i18n/LocaleProvider";
import { discoverSsoFn, completeSsoJitFn } from "@/lib/enterprise/enterprise.functions";
import { supabase } from "@/integrations/supabase/client";
import { CLIENT_CAPABILITY_FLAGS } from "@/lib/feature-flags";

export const Route = createFileRoute("/sso")({
  head: () => ({
    meta: [
      { title: "SSO — UseCasesX™" },
      {
        name: "description",
        content: "Sign in to UseCasesX™ with your organisation's single sign-on.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SsoDiscoveryPage,
});

function SsoDiscoveryPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get("complete");
    if (!orgId) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user?.email) return;
      try {
        await completeSsoJitFn({
          data: { organizationId: orgId, email: user.email },
        });
        navigate({ to: "/dashboard" });
      } catch {
        /* session may still land on auth */
      }
    })();
  }, [navigate]);

  if (!CLIENT_CAPABILITY_FLAGS.sso) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">{t.continueWithSso}</h1>
        <p className="text-sm text-muted-foreground">
          Single sign-on is not enabled on this deployment. Use email sign-in, or ask your
          administrator to enable the SSO capability flag.
        </p>
        <Button asChild variant="outline">
          <Link to="/auth">{t.signIn}</Link>
        </Button>
      </div>
    );
  }

  async function onDiscover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setOrgName(null);
    try {
      const { hit } = await discoverSsoFn({ data: { email } });
      if (!hit) {
        setError(t.noSsoForDomain);
        return;
      }
      setOrgName(hit.organizationName);

      if (hit.providerSlug) {
        const redirectTo = `${window.location.origin}/sso?complete=${hit.organizationId}`;
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: hit.providerSlug as any,
          options: { redirectTo },
        });
        if (oauthErr) {
          const anyAuth = supabase.auth as any;
          if (typeof anyAuth.signInWithSSO === "function") {
            const { error: ssoErr } = await anyAuth.signInWithSSO({
              domain: email.split("@")[1],
              options: { redirectTo },
            });
            if (ssoErr) throw ssoErr;
          } else {
            throw oauthErr;
          }
        }
        return;
      }

      setError(
        "SSO is configured for this domain, but the identity provider slug is not set yet. Ask your organisation admin to complete SSO setup.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "SSO discovery failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <div className="flex items-center justify-between">
        <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> {t.signIn}
        </Link>
        <LocaleSwitcher />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t.continueWithSso}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.enterWorkEmail}</p>
      </div>
      <form onSubmit={onDiscover} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sso-email">{t.email}</Label>
          <Input
            id="sso-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {orgName ? (
          <p className="text-sm text-muted-foreground">Redirecting to {orgName}…</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : t.discoverSso}
        </Button>
      </form>
    </div>
  );
}
