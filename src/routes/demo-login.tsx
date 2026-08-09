import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Demonstration sign-in. The personas below hold no production data and exist
 * only so a client walkthrough can switch roles quickly. The shared password is
 * a demonstration credential, not a secret — real accounts never use it.
 */
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "Demo@123-UCX";

const PERSONAS = [
  {
    email: "pro@demo.usecasex.app",
    label: "Pro User",
    blurb: "Standard Pro seat — discovery, studio, scoring, portfolio and reports.",
    plan: "Pro",
    tenant: "Meridian Retail (Pro Demo) · Pro Demo Workspace",
    featured: true,
  },
  {
    email: "enterprise@demo.usecasex.app",
    label: "Enterprise User",
    blurb: "Enterprise seat — ERP-verified value, governance and suite handoffs.",
    plan: "Enterprise",
    tenant: "Atlas Energy (Enterprise Demo) · Enterprise Demo Workspace",
    featured: true,
  },
  {
    email: "superadmin@demo.usecasex.app",
    label: "Platform SuperAdmin",
    blurb: "Platform administration, taxonomy governance and tenant oversight.",
    plan: "Enterprise",
    tenant: "UseCasesX Demo Platform",
  },
  {
    email: "tenantadmin@demo.usecasex.app",
    label: "Tenant Admin",
    blurb: "Workspace owner — members, entitlements, portfolios and reporting.",
    plan: "Enterprise",
    tenant: "Northwind Group (Demo Tenant)",
  },
  {
    email: "facilitator@demo.usecasex.app",
    label: "Facilitator / Trainer",
    blurb: "Runs Discovery & Value Design workshops end to end.",
    plan: "Pro",
    tenant: "Workshop Academy (Demo)",
  },
  {
    email: "participant1@demo.usecasex.app",
    label: "Participant One",
    blurb: "Submits pain points and opportunities, scores candidates.",
    plan: "Pro",
    tenant: "Workshop Academy (Demo)",
  },
  {
    email: "participant2@demo.usecasex.app",
    label: "Participant Two",
    blurb: "Second voice in the room — proves scoping and traceability.",
    plan: "Pro",
    tenant: "Workshop Academy (Demo)",
  },
];


export const Route = createFileRoute("/demo-login")({
  head: () => ({
    meta: [
      { title: "Demo access — UseCasesX™" },
      {
        name: "description",
        content:
          "Sign in as a demonstration persona to walk clients through UseCasesX™ discovery, studio, portfolio and workshop journeys.",
      },
      { property: "og:title", content: "Demo access — UseCasesX™" },
      {
        property: "og:description",
        content: "Role-based demonstration personas for guided UseCasesX™ walkthroughs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoLoginPage,
});

function DemoLoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (email: string) => {
    setError(null);
    setBusy(email);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });
    if (signInError) {
      setError(
        `${signInError.message} — demo personas may not be provisioned in this environment yet.`,
      );
      setBusy(null);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-6 py-10">
        <header className="space-y-2">
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Demonstration environment
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Demo access</h1>
          <p className="text-sm text-muted-foreground">
            Pick a persona to demonstrate the journey from that role&apos;s point of view. These
            accounts contain demonstration content only and share one workspace so a workshop can be
            run across facilitator and participants. Shared password:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">{DEMO_PASSWORD}</code>
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {[
          {
            heading: "Edition accounts",
            note: "Pre-seeded with opportunities, a portfolio and a sample report so the end-to-end journey is visible immediately.",
            items: PERSONAS.filter((p) => p.featured),
          },
          {
            heading: "Role accounts",
            note: "Administration and workshop roles for role-specific walkthroughs.",
            items: PERSONAS.filter((p) => !p.featured),
          },
        ].map((group) => (
          <section key={group.heading} className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">{group.heading}</h2>
              <p className="text-xs text-muted-foreground">{group.note}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.items.map((persona) => (
                <li key={persona.email}>
                  <Card className={persona.featured ? "h-full border-primary/50" : "h-full"}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        {persona.label}
                        <Badge variant={persona.featured ? "default" : "outline"}>
                          {persona.plan}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground">{persona.blurb}</p>
                      <p className="text-xs text-muted-foreground">{persona.tenant}</p>
                      <dl className="space-y-1 rounded-md bg-muted/50 p-2 text-xs">
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">Email</dt>
                          <dd className="truncate font-mono">{persona.email}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">Password</dt>
                          <dd className="font-mono">{DEMO_PASSWORD}</dd>
                        </div>
                      </dl>
                      <Button
                        className="w-full"
                        onClick={() => void signIn(persona.email)}
                        disabled={busy !== null}
                      >
                        {busy === persona.email && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Sign in as {persona.label}
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}


        <p className="text-xs text-muted-foreground">
          Using your own account instead?{" "}
          <Link to="/auth" className="underline">
            Go to the normal sign-in page
          </Link>
          .
        </p>
      </div>
    </SiteShell>
  );
}
