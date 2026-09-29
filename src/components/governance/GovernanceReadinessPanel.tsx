/**
 * Governance Readiness preview (FR-07) + CyberX C3G/SARN consented handoff.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import {
  DATA_CATEGORY_OPTIONS,
  deliveryStatusLabel,
  FRAMEWORK_META,
  getGovernancePreviewFn,
  GOVERNANCE_DISCLAIMER,
  handoffGovernanceToCyberXFn,
  mapFactsToThemes,
  PROVIDER_DEPLOYER_POSTURES,
  saveGovernancePreviewFn,
  TRI_STATE,
  type GovernanceFacts,
  type MappedTheme,
  type TriState,
} from "@/lib/governance";
import { CYBERX_CONSENT_STATEMENT } from "@/lib/governance/package";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Props = { useCaseId: string };

function applicabilityBadge(a: MappedTheme["applicability"]) {
  if (a === "applicable") return <Badge>Applicable</Badge>;
  if (a === "not_applicable") return <Badge variant="secondary">Not applicable</Badge>;
  return <Badge variant="outline">Not determined</Badge>;
}

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function GovernanceReadinessPanel({ useCaseId }: Props) {
  const getPreview = useServerFn(getGovernancePreviewFn);
  const savePreview = useServerFn(saveGovernancePreviewFn);
  const handoff = useServerFn(handoffGovernanceToCyberXFn);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["governance-preview", useCaseId],
    queryFn: () => getPreview({ data: { useCaseId } }),
  });

  const [facts, setFacts] = useState<GovernanceFacts | null>(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (query.data?.facts) setFacts(query.data.facts as GovernanceFacts);
  }, [query.data]);

  const mappings = useMemo(() => {
    if (!facts) return (query.data?.mappings ?? []) as MappedTheme[];
    return mapFactsToThemes(facts);
  }, [facts, query.data?.mappings]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!facts) throw new Error("Nothing to save");
      return savePreview({ data: { useCaseId, facts } });
    },
    onSuccess: () => {
      toast.success("Governance preview saved");
      void queryClient.invalidateQueries({ queryKey: ["governance-preview", useCaseId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handoffMutation = useMutation({
    mutationFn: () => handoff({ data: { useCaseId, consentConfirmed: consent } }),
    onSuccess: (result) => {
      toast.message(result.message, { duration: 8000 });
      downloadJson(result.fileName, result.package);
      void queryClient.invalidateQueries({ queryKey: ["governance-preview", useCaseId] });
      setConsent(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (query.isLoading || !facts) return <Skeleton className="h-48 w-full" />;

  const set = <K extends keyof GovernanceFacts>(key: K, value: GovernanceFacts[K]) =>
    setFacts((prev) => (prev ? { ...prev, [key]: value } : prev));

  const byFramework = (FRAMEWORK_META &&
    Object.keys(FRAMEWORK_META).map((fid) => ({
      id: fid as keyof typeof FRAMEWORK_META,
      themes: mappings.filter((m) => m.framework === fid),
    }))) ||
    [];

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>Not legal advice</AlertTitle>
        <AlertDescription className="text-sm">{GOVERNANCE_DISCLAIMER}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applicability facts</CardTitle>
          <CardDescription>
            Capture confirmed facts only. Leave undetermined where unknown — mappings will show Not
            determined.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="intended-purpose">Intended purpose</Label>
            <Textarea
              id="intended-purpose"
              value={facts.intendedPurpose}
              onChange={(e) => set("intendedPurpose", e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider / deployer posture</Label>
              <Select
                value={facts.providerDeployerPosture}
                onValueChange={(v) =>
                  set("providerDeployerPosture", v as GovernanceFacts["providerDeployerPosture"])
                }
              >
                <SelectTrigger aria-label="Provider deployer posture">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_DEPLOYER_POSTURES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="geography">Geography</Label>
              <Input
                id="geography"
                value={facts.geography}
                onChange={(e) => set("geography", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="affected">Affected persons</Label>
            <Textarea
              id="affected"
              value={facts.affectedPersons}
              onChange={(e) => set("affectedPersons", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Data categories</Label>
            <div className="flex flex-wrap gap-3">
              {DATA_CATEGORY_OPTIONS.map((cat) => {
                const checked = facts.dataCategories.includes(cat);
                return (
                  <label key={cat} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = v
                          ? [...facts.dataCategories, cat]
                          : facts.dataCategories.filter((c) => c !== cat);
                        set("dataCategories", next);
                      }}
                    />
                    {cat.replaceAll("_", " ")}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["vulnerableGroups", "Vulnerable groups"],
                ["criticalInfrastructure", "Critical infrastructure"],
                ["biometrics", "Biometrics"],
                ["highImpactDecisions", "High-impact decisions"],
                ["prohibitedUseIndicators", "Prohibited-use indicators"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Select
                  value={facts[key]}
                  onValueChange={(v) => set(key, v as TriState)}
                >
                  <SelectTrigger aria-label={label}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRI_STATE.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="prohibited-notes">Prohibited-use notes</Label>
            <Textarea
              id="prohibited-notes"
              value={facts.prohibitedUseNotes}
              onChange={(e) => set("prohibitedUseNotes", e.target.value)}
              rows={2}
            />
          </div>
          <Button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save preview
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Framework theme mappings</CardTitle>
          <CardDescription>
            Pack {query.data?.contentPackVersion} · {query.data?.contentPackDate} ·{" "}
            {query.data?.contentPackSource}. Themes show Not determined until facts are confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {byFramework.map(({ id, themes }) => (
              <AccordionItem key={id} value={id}>
                <AccordionTrigger>
                  {FRAMEWORK_META[id].label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {FRAMEWORK_META[id].version} · {FRAMEWORK_META[id].date}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {themes.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border p-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{t.label}</p>
                          <p className="text-muted-foreground">{t.rationale}</p>
                        </div>
                        {applicabilityBadge(t.applicability)}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CyberX C3G / SARN handoff</CardTitle>
          <CardDescription>
            Consent required. If the CyberX endpoint is not available, a signed-context package is
            downloaded and the request is queued — synchronization is never pretended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {query.data?.handoffDeliveryStatus &&
            query.data.handoffDeliveryStatus !== "not_attempted" && (
              <p className="text-sm">
                Delivery status:{" "}
                <Badge variant="outline">
                  {deliveryStatusLabel(query.data.handoffDeliveryStatus)}
                </Badge>
                {query.data.packageIntegrityHash && (
                  <span className="ml-2 text-muted-foreground">
                    integrity {query.data.packageIntegrityHash}
                  </span>
                )}
              </p>
            )}
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
            <span>{CYBERX_CONSENT_STATEMENT}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!consent || handoffMutation.isPending}
              onClick={() => handoffMutation.mutate()}
            >
              Consent & prepare CyberX package
            </Button>
            {query.data?.packageJson && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  downloadJson(
                    `cyberx-c3g-context-${useCaseId.slice(0, 8)}.json`,
                    query.data!.packageJson,
                  )
                }
              >
                Re-download package
              </Button>
            )}
            <Button type="button" variant="ghost" asChild>
              <Link to="/handoffs">Open handoff queue</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
