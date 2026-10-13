/**
 * Enterprise identity / sovereignty / support-access controls (V2-18).
 * Mounted on Organization setup. SSO UI is honest when the capability flag is off.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getSsoConfigFn,
  saveSsoConfigFn,
  getTenantPolicyFn,
  saveTenantPolicyFn,
  listSupportAccessFn,
  grantSupportAccessFn,
  revokeSupportAccessFn,
} from "@/lib/enterprise/enterprise.functions";
import {
  DATA_REGIONS,
  DATA_REGION_LABEL,
  AI_PROVIDER_ROUTES,
} from "@/lib/enterprise/tenant-policy";
import { SCIM_STATUS } from "@/lib/enterprise/sso";
import { IMPERSONATION_PROHIBITED } from "@/lib/enterprise/support-access";
import { CLIENT_CAPABILITY_FLAGS } from "@/lib/feature-flags";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

export function EnterpriseIdentityPanel() {
  const { t, locale, setLocale } = useLocale();
  const session = useSupabaseSession();
  const qc = useQueryClient();

  const fetchPolicy = useServerFn(getTenantPolicyFn);
  const savePolicy = useServerFn(saveTenantPolicyFn);
  const fetchSso = useServerFn(getSsoConfigFn);
  const saveSso = useServerFn(saveSsoConfigFn);
  const fetchGrants = useServerFn(listSupportAccessFn);
  const grantAccess = useServerFn(grantSupportAccessFn);
  const revokeAccess = useServerFn(revokeSupportAccessFn);

  const policyQ = useQuery({
    queryKey: ["tenant-policy"],
    queryFn: () => fetchPolicy(),
    enabled: Boolean(session),
  });
  const ssoQ = useQuery({
    queryKey: ["sso-config"],
    queryFn: () => fetchSso(),
    enabled: Boolean(session) && CLIENT_CAPABILITY_FLAGS.sso,
  });
  const grantsQ = useQuery({
    queryKey: ["support-grants"],
    queryFn: () => fetchGrants(),
    enabled: Boolean(session) && Boolean(policyQ.data?.canManage),
  });

  const policy = policyQ.data?.policy;
  const [region, setRegion] = useState<string>("unspecified");
  const [routes, setRoutes] = useState<string>("default");
  const [domains, setDomains] = useState("");
  const [providerSlug, setProviderSlug] = useState("");
  const [protocol, setProtocol] = useState<"oidc" | "saml">("oidc");
  const [granteeId, setGranteeId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("8");

  useEffect(() => {
    if (!policy) return;
    setRegion(policy.dataRegion);
    setRoutes((policy.allowedAiProviderRoutes ?? ["default"]).join(", "));
  }, [policy]);

  useEffect(() => {
    const cfg = ssoQ.data?.config;
    if (!cfg) return;
    setProtocol(cfg.protocol);
    setDomains(cfg.allowedDomains.join(", "));
    setProviderSlug(cfg.providerSlug ?? "");
  }, [ssoQ.data?.config]);

  const savePolicyMut = useMutation({
    mutationFn: () =>
      savePolicy({
        data: {
          dataRegion: region as (typeof DATA_REGIONS)[number],
          allowedAiProviderRoutes: routes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean) as never[],
          preferredLocale: locale,
        },
      }),
    onSuccess: () => {
      toast.success("Tenant policy saved");
      qc.invalidateQueries({ queryKey: ["tenant-policy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSsoMut = useMutation({
    mutationFn: () =>
      saveSso({
        data: {
          protocol,
          enabled: true,
          allowedDomains: domains
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
          jitEnabled: true,
          defaultMemberRole: "viewer",
          providerSlug: providerSlug || null,
          attributeEmailClaim: "email",
          attributeNameClaim: "name",
        },
      }),
    onSuccess: () => {
      toast.success("SSO configuration saved");
      qc.invalidateQueries({ queryKey: ["sso-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantMut = useMutation({
    mutationFn: () =>
      grantAccess({
        data: {
          workspaceId,
          granteeUserId: granteeId,
          reason,
          scopes: ["read"],
          durationHours: Number(hours) || 8,
        },
      }),
    onSuccess: () => {
      toast.success("Support access granted");
      setReason("");
      qc.invalidateQueries({ queryKey: ["support-grants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!policyQ.data?.canManage && !policyQ.isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Localization &amp; sovereignty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.locale}</Label>
              <Select
                value={locale}
                onValueChange={(v) => {
                  setLocale(v as "en" | "ar");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.dataRegion}</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {DATA_REGION_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t.aiProviderRoutes}</Label>
            <Input
              value={routes}
              onChange={(e) => setRoutes(e.target.value)}
              placeholder={AI_PROVIDER_ROUTES.join(", ")}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated allow-list. Declared region does not move infrastructure
              automatically.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => savePolicyMut.mutate()}
            disabled={savePolicyMut.isPending}
          >
            Save policy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">SSO (OIDC / SAML)</CardTitle>
          {!CLIENT_CAPABILITY_FLAGS.sso ? (
            <Badge variant="secondary">Not enabled</Badge>
          ) : (
            <Badge>Capability on</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {!CLIENT_CAPABILITY_FLAGS.sso ? (
            <p className="text-sm text-muted-foreground">
              Enable <code className="text-xs">CAPABILITY_SSO=true</code> (and{" "}
              <code className="text-xs">VITE_CAPABILITY_SSO=true</code>) to configure SSO. SCIM:{" "}
              {SCIM_STATUS.reason}
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v) => setProtocol(v as "oidc" | "saml")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oidc">OIDC</SelectItem>
                      <SelectItem value="saml">SAML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider slug</Label>
                  <Input
                    value={providerSlug}
                    onChange={(e) => setProviderSlug(e.target.value)}
                    placeholder="azure / okta / …"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Allowed email domains</Label>
                <Input
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  placeholder="example.gov, example.com"
                />
              </div>
              <Button size="sm" onClick={() => saveSsoMut.mutate()} disabled={saveSsoMut.isPending}>
                Save SSO config
              </Button>
              <p className="text-xs text-muted-foreground">{SCIM_STATUS.reason}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.supportAccess}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{IMPERSONATION_PROHIBITED}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Workspace ID</Label>
              <Input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Support user ID</Label>
              <Input value={granteeId} onChange={(e) => setGranteeId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.reason}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.durationHours}</Label>
              <Input value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => grantMut.mutate()}
            disabled={grantMut.isPending || reason.length < 8}
          >
            {t.grantAccess}
          </Button>
          <ul className="space-y-2 text-sm">
            {(grantsQ.data?.grants ?? []).slice(0, 8).map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span>
                  {g.granteeUserId.slice(0, 8)}… · ends {new Date(g.endsAt).toLocaleString()}
                  {g.revokedAt ? " · revoked" : ""}
                </span>
                {!g.revokedAt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      revokeAccess({ data: { grantId: g.id } }).then(() => {
                        toast.success("Revoked");
                        qc.invalidateQueries({ queryKey: ["support-grants"] });
                      })
                    }
                  >
                    {t.revoke}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
