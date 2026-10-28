import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnterpriseIdentityPanel } from "@/components/enterprise/EnterpriseIdentityPanel";
import { EnterpriseAdminPlaceholder } from "@/components/enterprise-admin/EnterpriseAdminPlaceholder";
import { usePlan } from "@/hooks/usePlan";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { LAUNCH_WORKSPACE_ROLES } from "@/lib/authz/launch-roles";
import { listAiProviders, DEFAULT_AI_PROVIDER_POLICY } from "@/lib/ai/provider";
import {
  ENTERPRISE_ADMIN_NAV,
  ENTERPRISE_ADMIN_SECTIONS,
  type EnterpriseAdminSectionId,
} from "@/lib/enterprise-admin/sections";
import { getOrganizationSetupFn } from "@/lib/organization.functions";
import {
  getTenantPolicyFn,
  listSupportAccessFn,
} from "@/lib/enterprise/enterprise.functions";
import { DATA_REGION_LABEL, type DataRegion } from "@/lib/enterprise/tenant-policy";
import { CLIENT_CAPABILITY_FLAGS } from "@/lib/feature-flags";

function SectionHeader({ id }: { id: EnterpriseAdminSectionId }) {
  const section = ENTERPRISE_ADMIN_SECTIONS[id];
  const Icon = section.icon;
  return (
    <div className="mb-6 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{section.label}</h1>
        {section.integration === "live" ? (
          <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Live</Badge>
        ) : section.integration === "partial" ? (
          <Badge variant="secondary">Partial</Badge>
        ) : (
          <Badge variant="outline">Planned</Badge>
        )}
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">{section.description}</p>
    </div>
  );
}

function OverviewBody() {
  return (
    <div className="space-y-6">
      <SectionHeader id="overview" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ENTERPRISE_ADMIN_NAV.filter((s) => s.id !== "overview").map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.id}
              to="/enterprise-admin/$section"
              params={{ section: section.id }}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{section.label}</span>
                    {section.integration === "live" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{section.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OrganizationBody() {
  const session = useSupabaseSession();
  const fetchSetup = useServerFn(getOrganizationSetupFn);
  const query = useQuery({
    queryKey: ["organization-setup", "enterprise-admin"],
    queryFn: () => fetchSetup(),
    enabled: Boolean(session),
  });
  const org = query.data?.organization as { name?: string; slug?: string } | undefined;
  const units = (query.data?.units as unknown[]) ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader id="organization" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {query.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : query.isError ? (
            <p className="text-destructive">Could not load organization (server denied or offline).</p>
          ) : (
            <>
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{org?.name ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Units:</span> {units.length}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/account/organization">Manage structure &amp; taxonomy</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessUnitsBody() {
  const session = useSupabaseSession();
  const fetchSetup = useServerFn(getOrganizationSetupFn);
  const query = useQuery({
    queryKey: ["organization-setup", "units"],
    queryFn: () => fetchSetup(),
    enabled: Boolean(session),
  });
  const units =
    (query.data?.units as Array<{ id: string; name: string; unit_type?: string }>) ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader id="business-units" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : units.length === 0 ? (
            <p className="text-sm text-muted-foreground">No units defined yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {units.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{u.name}</span>
                  <Badge variant="secondary">{u.unit_type ?? "unit"}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/account/organization">Edit units</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DataResidencyBody() {
  const session = useSupabaseSession();
  const fetchPolicy = useServerFn(getTenantPolicyFn);
  const query = useQuery({
    queryKey: ["tenant-policy", "residency"],
    queryFn: () => fetchPolicy(),
    enabled: Boolean(session),
  });
  const policy = query.data?.policy;

  return (
    <div className="space-y-6">
      <SectionHeader id="data-residency" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Declared residency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {query.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p>
                Region:{" "}
                <span className="font-medium">
                  {policy?.dataRegion
                    ? DATA_REGION_LABEL[policy.dataRegion as DataRegion] ?? policy.dataRegion
                    : "Not specified"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Enforcement runs on the server via tenant policy — this panel does not decide
                access.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/enterprise-admin/authentication-sso">Open identity &amp; policy panel</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AiProviderPolicyBody() {
  const session = useSupabaseSession();
  const fetchPolicy = useServerFn(getTenantPolicyFn);
  const query = useQuery({
    queryKey: ["tenant-policy", "ai"],
    queryFn: () => fetchPolicy(),
    enabled: Boolean(session),
  });
  const allowed = query.data?.policy?.allowedAiProviderRoutes ?? ["default"];
  const providers = listAiProviders();

  return (
    <div className="space-y-6">
      <SectionHeader id="ai-provider-policy" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant AI route allow-list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Routes permitted today (server-enforced):{" "}
            <span className="font-medium text-foreground">{allowed.join(", ")}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Default product policy permits:{" "}
            {DEFAULT_AI_PROVIDER_POLICY.permittedProviders.join(", ")}.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider catalogue</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {providers.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.label}</span>
                <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function RolesBody() {
  return (
    <div className="space-y-6">
      <SectionHeader id="roles-permissions" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launch roles (read-only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Roles are enforced via <code className="text-xs">user_roles</code> /{" "}
            <code className="text-xs">has_role()</code> and RLS — not in this UI.
          </p>
          <ul className="space-y-2">
            {LAUNCH_WORKSPACE_ROLES.map((role) => (
              <li key={role.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-sm font-medium">{role.label}</p>
                <p className="text-xs text-muted-foreground">{role.summary}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SupportAccessBody() {
  const session = useSupabaseSession();
  const fetchGrants = useServerFn(listSupportAccessFn);
  const query = useQuery({
    queryKey: ["support-grants", "enterprise-admin"],
    queryFn: () => fetchGrants(),
    enabled: Boolean(session),
  });

  return (
    <div className="space-y-6">
      <SectionHeader id="support-access" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active grants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {query.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : query.isError ? (
            <p className="text-muted-foreground">
              Support access list requires organization admin rights on the server.
            </p>
          ) : (
            <p>{query.data?.grants?.length ?? 0} grant record(s) returned by the server.</p>
          )}
          <p className="text-muted-foreground">
            Manage grants in the identity panel (impersonation is prohibited).
          </p>
        </CardContent>
      </Card>
      <EnterpriseIdentityPanel />
    </div>
  );
}

function EntitlementsBody() {
  const plan = usePlan();
  const ent = useEntitlement();

  return (
    <div className="space-y-6">
      <SectionHeader id="feature-entitlements" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resolved plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Plan:{" "}
            <span className="font-medium">
              {plan.loading ? "…" : (plan.planType ?? plan.tier)}
            </span>
          </p>
          <p className="text-muted-foreground">
            Entitlement hooks: {ent ? "loaded via useEntitlement" : "unavailable"}. Client display
            only — server re-checks on every privileged action.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/entitlement">Open entitlement page</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capability flags (public)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(CLIENT_CAPABILITY_FLAGS).map(([key, on]) => (
              <li
                key={key}
                className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs"
              >
                <code>{key}</code>
                <Badge variant={on ? "default" : "outline"}>{on ? "on" : "off"}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function LinkedPartial({
  id,
  href,
  cta,
}: {
  id: EnterpriseAdminSectionId;
  href: string;
  cta: string;
}) {
  const section = ENTERPRISE_ADMIN_SECTIONS[id];
  return (
    <div className="space-y-6">
      <SectionHeader id={id} />
      <Card>
        <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
          <p>{section.description}</p>
          <p>
            This section is partially integrated. Use the existing authenticated surface below —
            administration privileges are enforced there, not in this card.
          </p>
          <Button asChild size="sm">
            <Link to={href as "/dashboard"}>{cta}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function EnterpriseAdminSectionBody({
  sectionId,
}: {
  sectionId: EnterpriseAdminSectionId;
}) {
  const section = ENTERPRISE_ADMIN_SECTIONS[sectionId];

  switch (sectionId) {
    case "overview":
      return <OverviewBody />;
    case "organization":
      return <OrganizationBody />;
    case "business-units":
      return <BusinessUnitsBody />;
    case "authentication-sso":
      return (
        <div className="space-y-6">
          <SectionHeader id="authentication-sso" />
          <EnterpriseIdentityPanel />
        </div>
      );
    case "data-residency":
      return <DataResidencyBody />;
    case "ai-provider-policy":
      return <AiProviderPolicyBody />;
    case "roles-permissions":
      return <RolesBody />;
    case "support-access":
      return <SupportAccessBody />;
    case "feature-entitlements":
      return <EntitlementsBody />;
    case "usage":
      return (
        <LinkedPartial id="usage" href="/admin-observability" cta="Open Export & AI Activity" />
      );
    case "audit-logs":
      return <LinkedPartial id="audit-logs" href="/admin-audit" cta="Open audit surface" />;
    case "subscription":
      return <LinkedPartial id="subscription" href="/entitlement" cta="Open entitlements" />;
    case "integrations":
      return <LinkedPartial id="integrations" href="/handoffs" cta="Open suite handoffs" />;
    case "data-export":
      return <LinkedPartial id="data-export" href="/reports" cta="Open reports & exports" />;
    case "security":
      return (
        <LinkedPartial id="security" href="/account/security" cta="Open account security" />
      );
    default:
      return (
        <div className="space-y-6">
          <SectionHeader id={sectionId} />
          <EnterpriseAdminPlaceholder section={section} />
        </div>
      );
  }
}
