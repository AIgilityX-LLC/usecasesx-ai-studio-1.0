/**
 * Structured handoff request dialog.
 *
 * One dialog, four targets. It never implies an automatic integration: the
 * delivery statement from the model is shown before the send button, and while
 * a target is queue-backed the copy says so in plain words.
 */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Loader2, ShieldCheck } from "lucide-react";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { createHandoffRequest } from "@/lib/domain/handoffs.repository";
import {
  deliveryStatement,
  consentStatement,
  HANDOFF_TARGET_META,
  LIFECYCLE_STAGES,
  requiresConsent,
  RISK_INDICATOR_OPTIONS,
  SENSITIVITY_META,
  validateDraft,
  type HandoffDraft,
  type HandoffSourceRef,
  type HandoffTarget,
} from "@/lib/handoffs/handoff.model";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: HandoffTarget;
  /** Records this request points at. Never copied — referenced. */
  sourceRefs: HandoffSourceRef[];
  defaultTitle?: string;
  defaultRequestType?: string;
};

function emptyPayload(target: HandoffTarget): Record<string, unknown> {
  switch (target) {
    case "sarpi":
      return {
        organizationName: "",
        assessmentType: "",
        readinessAssumptions: "",
        valueAssumptions: "",
      };
    case "sarn_c3g":
      return {
        caseReference: "",
        lifecycleStage: "",
        riskIndicators: [] as string[],
        governanceConcerns: "",
      };
    case "advisorx":
      return {
        requestedOutput: "",
        audience: "",
        contextSnapshot: [] as string[],
        constraints: "",
      };
    case "human_advisory":
      return {
        contact: { name: "", email: "", role: "" },
        portfolioSummary: "",
        workshopInterest: false,
        nextStep: "",
      };
  }
}

export function HandoffRequestDialog({
  open,
  onOpenChange,
  target,
  sourceRefs,
  defaultTitle = "",
  defaultRequestType,
}: Props) {
  const meta = HANDOFF_TARGET_META[target];
  const sensitivity = SENSITIVITY_META[meta.sensitivity];
  const session = useSupabaseSession();
  const { data: context } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const workspaceId = context?.workspace?.id ?? null;

  const [requestType, setRequestType] = useState(
    defaultRequestType ?? meta.requestTypes[0]?.key ?? "",
  );
  const [title, setTitle] = useState(defaultTitle);
  const [summary, setSummary] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown>>(() => emptyPayload(target));
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (key: string, value: unknown) =>
    setPayload((prev) => ({ ...prev, [key]: value }));

  const draft: HandoffDraft = useMemo(
    () => ({ target, requestType, title, summary, payload, consentConfirmed, sourceRefs }),
    [target, requestType, title, summary, payload, consentConfirmed, sourceRefs],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !session?.user.id) {
        throw new Error("We could not resolve your workspace. Please refresh and try again.");
      }
      return createHandoffRequest({
        workspaceId,
        requestedBy: session.user.id,
        draft,
      });
    },
    onSuccess: () => {
      toast.success("Request queued", { description: deliveryStatement(target) });
      queryClient.invalidateQueries({ queryKey: ["handoff-requests"] });
      onOpenChange(false);
      setErrors({});
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "We could not send that request.";
      toast.error("Request not sent", { description: message });
    },
  });

  const submit = () => {
    const validation = validateDraft(draft);
    setErrors(validation.errors);
    if (!validation.ok) return;
    mutation.mutate();
  };

  const err = (key: string) =>
    errors[key] ? (
      <p className="text-sm text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null;

  const toggleInList = (key: string, value: string) => {
    const current = (payload[key] as string[]) ?? [];
    setField(
      key,
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request: {meta.label}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>How this request travels</AlertTitle>
          <AlertDescription>{deliveryStatement(target)}</AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handoff-type">What are you asking for?</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger id="handoff-type">
                <SelectValue placeholder="Choose a request type" />
              </SelectTrigger>
              <SelectContent>
                {meta.requestTypes.map((type) => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {meta.requestTypes.find((t) => t.key === requestType)?.help}
            </p>
            {err("requestType")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="handoff-title">Title</Label>
            <Input
              id="handoff-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title for this request"
            />
            {err("title")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="handoff-summary">Summary (optional)</Label>
            <Textarea
              id="handoff-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Anything the receiving team should know first"
            />
          </div>

          {/* ---------------------------------------------------- SARPI */}
          {target === "sarpi" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sarpi-org">Organization</Label>
                <Input
                  id="sarpi-org"
                  value={String(payload["organizationName"] ?? "")}
                  onChange={(e) => setField("organizationName", e.target.value)}
                />
                {err("payload.organizationName")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sarpi-assessment">Assessment type</Label>
                <Input
                  id="sarpi-assessment"
                  value={String(payload["assessmentType"] ?? "")}
                  onChange={(e) => setField("assessmentType", e.target.value)}
                  placeholder="e.g. Data & process readiness"
                />
                {err("payload.assessmentType")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sarpi-readiness">Readiness assumptions</Label>
                <Textarea
                  id="sarpi-readiness"
                  rows={3}
                  value={String(payload["readinessAssumptions"] ?? "")}
                  onChange={(e) => setField("readinessAssumptions", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sarpi-value">Value assumptions</Label>
                <Textarea
                  id="sarpi-value"
                  rows={3}
                  value={String(payload["valueAssumptions"] ?? "")}
                  onChange={(e) => setField("valueAssumptions", e.target.value)}
                />
              </div>
            </>
          )}

          {/* ------------------------------------------------- SARN / C3G */}
          {target === "sarn_c3g" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="c3g-ref">Case reference</Label>
                <Input
                  id="c3g-ref"
                  value={String(payload["caseReference"] ?? "")}
                  onChange={(e) => setField("caseReference", e.target.value)}
                />
                {err("payload.caseReference")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="c3g-stage">Lifecycle stage</Label>
                <Select
                  value={String(payload["lifecycleStage"] ?? "")}
                  onValueChange={(value) => setField("lifecycleStage", value)}
                >
                  <SelectTrigger id="c3g-stage">
                    <SelectValue placeholder="Choose a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {err("payload.lifecycleStage")}
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Risk indicators</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {RISK_INDICATOR_OPTIONS.map((indicator) => {
                    const checked = ((payload["riskIndicators"] as string[]) ?? []).includes(
                      indicator,
                    );
                    return (
                      <label key={indicator} className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleInList("riskIndicators", indicator)}
                          aria-label={indicator}
                        />
                        <span>{indicator}</span>
                      </label>
                    );
                  })}
                </div>
                {err("payload.riskIndicators")}
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="c3g-concerns">Governance concerns</Label>
                <Textarea
                  id="c3g-concerns"
                  rows={3}
                  value={String(payload["governanceConcerns"] ?? "")}
                  onChange={(e) => setField("governanceConcerns", e.target.value)}
                />
              </div>
            </>
          )}

          {/* -------------------------------------------------- AdvisorX */}
          {target === "advisorx" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="adv-output">Requested output</Label>
                <Input
                  id="adv-output"
                  value={String(payload["requestedOutput"] ?? "")}
                  onChange={(e) => setField("requestedOutput", e.target.value)}
                  placeholder="e.g. Two-page executive brief"
                />
                {err("payload.requestedOutput")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adv-audience">Audience</Label>
                <Input
                  id="adv-audience"
                  value={String(payload["audience"] ?? "")}
                  onChange={(e) => setField("audience", e.target.value)}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Context to share (references only — no data is copied)
                </legend>
                <div className="space-y-2">
                  {sourceRefs.map((ref) => {
                    const key = `${ref.type}:${ref.id}`;
                    const checked = ((payload["contextSnapshot"] as string[]) ?? []).includes(key);
                    return (
                      <label key={key} className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleInList("contextSnapshot", key)}
                          aria-label={ref.label}
                        />
                        <span>
                          {ref.label} <span className="text-muted-foreground">({ref.type})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {err("payload.contextSnapshot")}
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="adv-constraints">Constraints</Label>
                <Textarea
                  id="adv-constraints"
                  rows={3}
                  value={String(payload["constraints"] ?? "")}
                  onChange={(e) => setField("constraints", e.target.value)}
                />
              </div>
            </>
          )}

          {/* -------------------------------------------- Human advisory */}
          {target === "human_advisory" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adv-name">Contact name</Label>
                  <Input
                    id="adv-name"
                    value={String((payload["contact"] as any)?.name ?? "")}
                    onChange={(e) =>
                      setField("contact", {
                        ...(payload["contact"] as object),
                        name: e.target.value,
                      })
                    }
                  />
                  {err("payload.contact.name")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adv-email">Contact email</Label>
                  <Input
                    id="adv-email"
                    type="email"
                    value={String((payload["contact"] as any)?.email ?? "")}
                    onChange={(e) =>
                      setField("contact", {
                        ...(payload["contact"] as object),
                        email: e.target.value,
                      })
                    }
                  />
                  {err("payload.contact.email")}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adv-role">Role</Label>
                <Input
                  id="adv-role"
                  value={String((payload["contact"] as any)?.role ?? "")}
                  onChange={(e) =>
                    setField("contact", {
                      ...(payload["contact"] as object),
                      role: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adv-portfolio">Portfolio summary</Label>
                <Textarea
                  id="adv-portfolio"
                  rows={3}
                  value={String(payload["portfolioSummary"] ?? "")}
                  onChange={(e) => setField("portfolioSummary", e.target.value)}
                />
                {err("payload.portfolioSummary")}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={Boolean(payload["workshopInterest"])}
                  onCheckedChange={(value) => setField("workshopInterest", value === true)}
                  aria-label="Interested in a facilitated workshop"
                />
                <span>We are interested in a facilitated discovery / value workshop.</span>
              </label>
              <div className="space-y-2">
                <Label htmlFor="adv-next">Preferred next step</Label>
                <Input
                  id="adv-next"
                  value={String(payload["nextStep"] ?? "")}
                  onChange={(e) => setField("nextStep", e.target.value)}
                  placeholder="e.g. 30-minute introduction call"
                />
                {err("payload.nextStep")}
              </div>
            </>
          )}

          {/* ------------------------------------------------- references */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">This request references</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {sourceRefs.map((ref) => (
                <li key={`${ref.type}:${ref.id}`}>
                  {ref.label}{" "}
                  <Badge variant="outline" className="ml-1 align-middle">
                    {ref.type}
                  </Badge>
                </li>
              ))}
              {sourceRefs.length === 0 && <li>No records referenced yet.</li>}
            </ul>
            {err("sourceRefs")}
            <p className="mt-2 text-xs text-muted-foreground">
              We record a pointer and a version stamp for each record, not a copy of its contents.
            </p>
          </div>

          {/* ---------------------------------------------------- consent */}
          <div className="rounded-lg border border-border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {sensitivity.label} context
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{sensitivity.note}</p>
            {requiresConsent(target) && (
              <label className="mt-3 flex items-start gap-2 text-sm">
                <Checkbox
                  checked={consentConfirmed}
                  onCheckedChange={(value) => setConsentConfirmed(value === true)}
                  aria-label="Confirm sharing consent"
                />
                <span>{consentStatement(target)}</span>
              </label>
            )}
            {err("consent")}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending || !workspaceId}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
