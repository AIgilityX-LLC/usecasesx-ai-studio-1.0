import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Loader2, Sparkles, Plus, X } from "lucide-react";
import { AiSafetyNotice } from "@/components/ai/AiSafetyNotice";
import { AiDraftSuggestion } from "@/components/opportunities/AiDraftSuggestion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AutosaveStatus,
  ConfirmDialog,
  DraftRecoveryBanner,
  useUnsavedChanges,
} from "@/components/ui-kit";
import { describeSavedAt, hasConflict, type AutosaveState } from "@/lib/drafts";
import {
  clearLocalDraft,
  completionOf,
  emptyDraft,
  isConvertible,
  missingInformationPrompts,
  OPPORTUNITY_SOURCES,
  opportunityDraftKey,
  readLocalDraft,
  SOURCE_LABELS,
  URGENCIES,
  URGENCY_LABELS,
  writeLocalDraft,
  type IntakeMode,
  type OpportunityDraft,
  type OpportunitySource,
  type SimilarHit,
  type StoredLocalDraft,
} from "@/lib/opportunities";

import {
  convertOpportunityFn,
  findSimilarOpportunitiesFn,
  recordOpportunityAssistFn,
  saveOpportunityFn,
} from "@/lib/opportunities.functions";
import { enrichOpportunityFn } from "@/lib/ai.functions";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { isUnauthorizedError, signInHref, SIGN_IN_TO_SAVE } from "@/lib/auth-errors";

type Suggestions = {
  refinedProblemStatement?: string;
  suggestedKpis?: string[];
  suggestedRisks?: string[];
  clarifyingQuestions?: string[];
  suggestedCapabilities?: string[];
  suggestedDataRequirements?: string[];
};

export function OpportunityForm({
  opportunityId,
  initial,
  sourceUseCaseId,
  serverUpdatedAt,
  onSaved,
  convertedUseCaseId,
}: {
  opportunityId?: string | null;
  initial?: OpportunityDraft;
  sourceUseCaseId?: string | null;
  /** `updated_at` of the saved record, used to detect draft conflicts. */
  serverUpdatedAt?: string | null;
  onSaved?: (id: string) => void;
  /** When already converted, show Continue rather than Design. */
  convertedUseCaseId?: string | null;
}) {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const signedOut = session === null;
  const save = useServerFn(saveOpportunityFn);
  const findSimilar = useServerFn(findSimilarOpportunitiesFn);
  const enrich = useServerFn(enrichOpportunityFn);
  const recordAssist = useServerFn(recordOpportunityAssistFn);
  const convert = useServerFn(convertOpportunityFn);

  const [mode, setMode] = useState<IntakeMode>("quick");
  const [draft, setDraft] = useState<OpportunityDraft>(() => initial ?? emptyDraft());
  const [id, setId] = useState<string | null>(opportunityId ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [duplicates, setDuplicates] = useState<{
    opportunities: SimilarHit[];
    repository: SimilarHit[];
  }>({ opportunities: [], repository: [] });
  const [assistLoading, setAssistLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [piiOpen, setPiiOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [stakeholderInput, setStakeholderInput] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const completion = useMemo(() => completionOf(draft), [draft]);
  const missingPrompts = useMemo(() => missingInformationPrompts(draft), [draft]);
  const canSave = draft.title.trim().length >= 3;
  const draftKey = opportunityDraftKey(id);
  const convertible = isConvertible(draft);

  useUnsavedChanges(dirty && !saving);

  const set = useCallback(
    <K extends keyof OpportunityDraft>(key: K, value: OpportunityDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
      setSaveFailed(false);
    },
    [],
  );

  /* --- local draft survives a refresh, an expired session or a crash ------- */
  const [recovered, setRecovered] = useState<StoredLocalDraft | null>(null);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);

  useEffect(() => {
    // A prefilled draft (e.g. captured from a repository entry) wins over cache.
    if (!opportunityId && initial && initial.title.trim().length > 0) return;
    const stored = readLocalDraft(draftKey);
    if (stored && stored.data.title.trim().length > 0) setRecovered(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The saved record moved on after this device wrote its copy. */
  const conflict = hasConflict(recovered, serverUpdatedAt);

  const restoreDraft = useCallback(() => {
    if (!recovered) return;
    setDraft(recovered.data);
    setDirty(true);
    setRestoredAt(recovered.savedAt);
    setRecovered(null);
    toast.success("Draft restored");
  }, [recovered]);

  const discardDraft = useCallback(() => {
    clearLocalDraft(draftKey);
    setRecovered(null);
    toast.success(conflict ? "Keeping the saved version" : "Saved draft discarded");
  }, [conflict, draftKey]);

  useEffect(() => {
    if (!dirty) return;
    writeLocalDraft(draft, draftKey, serverUpdatedAt ?? null);
  }, [draft, dirty, draftKey, serverUpdatedAt]);

  /* --- explicit + autosave ------------------------------------------------ */
  const persist = useCallback(
    async (silent: boolean) => {
      if (!canSave) return null;
      if (signedOut) {
        if (!silent) {
          toast.error(SIGN_IN_TO_SAVE, {
            action: {
              label: "Sign in",
              onClick: () => {
                window.location.href = signInHref("/opportunities/new");
              },
            },
          });
        }
        return null;
      }
      setSaving(true);
      try {
        const row = await save({
          data: { id, draft, sourceUseCaseId: sourceUseCaseId ?? null },
        });
        setId(row.id);
        setDirty(false);
        setSaveFailed(false);
        setLastSavedAt(new Date().toISOString());
        clearLocalDraft(draftKey);
        clearLocalDraft(opportunityDraftKey(row.id));
        setRestoredAt(null);
        if (!silent) toast.success("Opportunity saved");
        onSaved?.(row.id);
        return row.id;
      } catch (error) {
        setSaveFailed(true);
        if (isUnauthorizedError(error)) {
          toast.error(SIGN_IN_TO_SAVE, {
            action: {
              label: "Sign in",
              onClick: () => {
                window.location.href = signInHref("/opportunities/new");
              },
            },
          });
        } else {
          toast.error(error instanceof Error ? error.message : "Could not save the opportunity.");
        }
        return null;
      } finally {
        setSaving(false);
      }
    },
    [canSave, draft, draftKey, id, onSaved, save, signedOut, sourceUseCaseId],
  );

  const autosaveState: AutosaveState = saving
    ? "saving"
    : saveFailed
      ? "error"
      : signedOut && dirty
        ? "local"
        : dirty
          ? "unsaved"
          : lastSavedAt
            ? "saved"
            : "idle";

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty || !canSave || signedOut) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => void persist(true), 2500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [draft, dirty, canSave, persist, signedOut]);

  /* --- non-blocking duplicate / pattern hints ----------------------------- */
  useEffect(() => {
    const title = draft.title.trim();
    if (title.length < 6) {
      setDuplicates({ opportunities: [], repository: [] });
      return;
    }
    const t = setTimeout(() => {
      findSimilar({
        data: {
          title,
          painPoint: draft.painPoint.trim() || undefined,
          excludeId: id,
        },
      })
        .then(setDuplicates)
        .catch(() => setDuplicates({ opportunities: [], repository: [] }));
    }, 700);
    return () => clearTimeout(t);
  }, [draft.title, draft.painPoint, findSimilar, id]);

  /* --- AI clarification: PII warning first, then suggestions only --------- */
  async function runAssist() {
    const description = [draft.painPoint, draft.baseline, draft.desiredOutcome, draft.constraints]
      .filter(Boolean)
      .join("\n\n");
    if (!draft.title.trim() || description.trim().length < 20) {
      toast.error(
        "Add a pain point or desired outcome first so the assistant has something to work with.",
      );
      return;
    }
    setAssistLoading(true);
    try {
      const savedId = id ?? (await persist(true));
      const result = (await enrich({
        data: {
          title: draft.title.trim(),
          description,
          providerAlias: null,
          entity: savedId ? { type: "opportunity", id: savedId } : null,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any;
      const output: Suggestions = result?.output ?? result?.data ?? result;
      setSuggestions(output);
      if (savedId) {
        await recordAssist({
          data: { id: savedId, suggestions: output as Record<string, never> },
        }).catch(() => undefined);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The assistant is unavailable right now.",
      );
    } finally {
      setAssistLoading(false);
    }
  }

  async function continueToCanvas() {
    if (!convertible) {
      toast.error("Add the pain point and desired outcome before designing a use case.");
      return;
    }
    setConverting(true);
    try {
      const savedId = id ?? (await persist(true));
      if (!savedId) {
        toast.error("Save the opportunity before continuing to Studio.");
        return;
      }
      if (convertedUseCaseId) {
        navigate({ to: "/studio/use-case/$id", params: { id: convertedUseCaseId } });
        return;
      }
      const result = await convert({ data: { id: savedId } });
      toast.success(result.reused ? "Opening the existing use case" : "Opening Studio Canvas");
      navigate({ to: "/studio/use-case/$id", params: { id: result.draftId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open Studio.");
    } finally {
      setConverting(false);
    }
  }

  function addStakeholder() {
    const value = stakeholderInput.trim();
    if (!value) return;
    set("stakeholders", [...draft.stakeholders, value].slice(0, 25));
    setStakeholderInput("");
  }

  function addEvidence() {
    const label = evidenceLabel.trim();
    if (!label) return;
    set(
      "evidence",
      [...draft.evidence, { label, url: evidenceUrl.trim() || null, note: null }].slice(0, 20),
    );
    setEvidenceLabel("");
    setEvidenceUrl("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {signedOut ? (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-muted-foreground">
              You are not signed in. Capture the problem now — your draft stays on this device, and
              signing in saves it to your workspace.
            </p>
            <Button asChild size="sm" className="shrink-0">
              <a href={signInHref("/opportunities/new")}>Sign in to save</a>
            </Button>
          </div>
        ) : null}
        {recovered ? (
          <DraftRecoveryBanner
            label={recovered.data.title.trim() || "Untitled problem"}
            savedAt={recovered.savedAt}
            conflict={conflict}
            serverUpdatedAt={serverUpdatedAt}
            onRestore={restoreDraft}
            onDiscard={discardDraft}
          />
        ) : null}

        {restoredAt && dirty ? (
          <p role="status" className="text-xs text-muted-foreground">
            Restored from your local draft ({describeSavedAt(restoredAt)}).{" "}
            {signedOut ? "Sign in to save it to your workspace." : "Saving to your workspace…"}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={mode} onValueChange={(v) => setMode(v as IntakeMode)}>
            <TabsList aria-label="Capture mode">
              <TabsTrigger value="quick">Quick capture</TabsTrigger>
              <TabsTrigger value="guided">Guided intake</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            {mode === "quick"
              ? "Name the problem, pain and outcome. Add more later."
              : "Walk through workflow, users, sponsor, geography and constraints."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">The business problem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opp-title">
                Problem name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="opp-title"
                value={draft.title}
                maxLength={200}
                placeholder="e.g. Claims triage takes five days"
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opp-pain">What is going wrong today?</Label>
              <Textarea
                id="opp-pain"
                value={draft.painPoint}
                rows={4}
                maxLength={4000}
                placeholder="Describe the pain, who feels it and what it costs. No solution yet."
                onChange={(e) => set("painPoint", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opp-outcome">What would good look like?</Label>
              <Textarea
                id="opp-outcome"
                value={draft.desiredOutcome}
                rows={3}
                maxLength={2000}
                placeholder="The outcome you want — still in business terms."
                onChange={(e) => set("desiredOutcome", e.target.value)}
              />
            </div>

            {mode === "quick" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="opp-urgency-quick">Urgency</Label>
                  <Select
                    value={draft.urgency}
                    onValueChange={(v) => set("urgency", v as OpportunityDraft["urgency"])}
                  >
                    <SelectTrigger id="opp-urgency-quick">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCIES.map((u) => (
                        <SelectItem key={u} value={u}>
                          {URGENCY_LABELS[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-owner-quick">Accountable owner</Label>
                  <Input
                    id="opp-owner-quick"
                    value={draft.ownerName}
                    onChange={(e) => set("ownerName", e.target.value)}
                    placeholder="Name or role"
                  />
                </div>
              </div>
            ) : null}

            {(duplicates.opportunities.length > 0 || duplicates.repository.length > 0) && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Possibly related — you can carry on regardless</p>
                <ul className="mt-2 space-y-2 text-muted-foreground">
                  {duplicates.opportunities.map((d) => (
                    <li key={d.id}>
                      <span className="text-foreground">{d.title}</span>
                      {d.status ? ` (${d.status})` : ""}
                      <span className="block text-xs">
                        Workspace · {d.reason}
                        {d.score > 0 ? ` · ${Math.round(d.score * 100)}% overlap` : ""}
                      </span>
                    </li>
                  ))}
                  {duplicates.repository.map((d) => (
                    <li key={d.slug}>
                      Repository pattern: <span className="text-foreground">{d.title}</span>
                      <span className="block text-xs">
                        {d.reason}
                        {d.score > 0 ? ` · ${Math.round(d.score * 100)}% overlap` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mode === "quick" ? (
              <Button
                type="button"
                variant="link"
                className="h-auto px-0"
                onClick={() => setMode("guided")}
              >
                Need more structure? Switch to guided intake
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {mode === "guided" ? (
          <Accordion
            key={mode}
            type="multiple"
            defaultValue={["context", "people", "baseline", "scope", "origin"]}
            className="rounded-lg border border-border px-4"
          >
            <AccordionItem value="context">
              <AccordionTrigger>Current workflow and strategy</AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="opp-process">Current workflow</Label>
                    <Input
                      id="opp-process"
                      value={draft.process}
                      onChange={(e) => set("process", e.target.value)}
                      placeholder="e.g. First notification of loss"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opp-function">Organisation / function</Label>
                    <Input
                      id="opp-function"
                      value={draft.businessFunction}
                      onChange={(e) => set("businessFunction", e.target.value)}
                      placeholder="e.g. Operations — Claims"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-objective">Strategic objective</Label>
                  <Textarea
                    id="opp-objective"
                    rows={2}
                    value={draft.strategicObjective}
                    onChange={(e) => set("strategicObjective", e.target.value)}
                    placeholder="Link the problem to a stated business objective."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="people">
              <AccordionTrigger>Affected users, owner and sponsor</AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="opp-affected">Affected users</Label>
                  <Textarea
                    id="opp-affected"
                    rows={2}
                    value={draft.affectedUsers}
                    onChange={(e) => set("affectedUsers", e.target.value)}
                    placeholder="Roles, teams or citizen groups who feel this pain"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="opp-owner">Accountable owner</Label>
                    <Input
                      id="opp-owner"
                      value={draft.ownerName}
                      onChange={(e) => set("ownerName", e.target.value)}
                      placeholder="Name or role that owns the outcome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opp-sponsor">Sponsor</Label>
                    <Input
                      id="opp-sponsor"
                      value={draft.sponsorName}
                      onChange={(e) => set("sponsorName", e.target.value)}
                      placeholder="Executive or business sponsor"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-stakeholder">Stakeholders</Label>
                  <div className="flex gap-2">
                    <Input
                      id="opp-stakeholder"
                      value={stakeholderInput}
                      onChange={(e) => setStakeholderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addStakeholder();
                        }
                      }}
                      placeholder="Add a stakeholder and press Enter"
                    />
                    <Button type="button" variant="secondary" onClick={addStakeholder}>
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add stakeholder</span>
                    </Button>
                  </div>
                  {draft.stakeholders.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {draft.stakeholders.map((s, i) => (
                        <Badge key={`${s}-${i}`} variant="secondary" className="gap-1">
                          {s}
                          <button
                            type="button"
                            aria-label={`Remove ${s}`}
                            onClick={() =>
                              set(
                                "stakeholders",
                                draft.stakeholders.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="baseline">
              <AccordionTrigger>Pain baseline, urgency and evidence</AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="opp-baseline">Pain baseline</Label>
                  <Textarea
                    id="opp-baseline"
                    rows={2}
                    value={draft.baseline}
                    onChange={(e) => set("baseline", e.target.value)}
                    placeholder="Current volume, cycle time, cost or error rate."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-urgency">Urgency</Label>
                  <Select
                    value={draft.urgency}
                    onValueChange={(v) => set("urgency", v as OpportunityDraft["urgency"])}
                  >
                    <SelectTrigger id="opp-urgency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCIES.map((u) => (
                        <SelectItem key={u} value={u}>
                          {URGENCY_LABELS[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-evidence">Evidence</Label>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      id="opp-evidence"
                      value={evidenceLabel}
                      onChange={(e) => setEvidenceLabel(e.target.value)}
                      placeholder="What it shows"
                    />
                    <Input
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://… (optional)"
                    />
                    <Button type="button" variant="secondary" onClick={addEvidence}>
                      Add
                    </Button>
                  </div>
                  {draft.evidence.length > 0 && (
                    <ul className="space-y-1 pt-1 text-sm text-muted-foreground">
                      {draft.evidence.map((e, i) => (
                        <li key={`${e.label}-${i}`} className="flex items-center gap-2">
                          <span className="text-foreground">{e.label}</span>
                          {e.url ? <span className="truncate">{e.url}</span> : null}
                          <button
                            type="button"
                            aria-label={`Remove ${e.label}`}
                            onClick={() =>
                              set(
                                "evidence",
                                draft.evidence.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scope">
              <AccordionTrigger>Geography and constraints</AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="opp-geography">Geography</Label>
                  <Input
                    id="opp-geography"
                    value={draft.geography}
                    onChange={(e) => set("geography", e.target.value)}
                    placeholder="Region, country or jurisdiction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-constraints">Constraints</Label>
                  <Textarea
                    id="opp-constraints"
                    rows={3}
                    value={draft.constraints}
                    onChange={(e) => set("constraints", e.target.value)}
                    placeholder="Policy, budget, timing, technology or regulatory limits"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="origin">
              <AccordionTrigger>Where this came from</AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="opp-source">Origin</Label>
                  <Select
                    value={draft.source}
                    onValueChange={(v) => set("source", v as OpportunitySource)}
                  >
                    <SelectTrigger id="opp-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPPORTUNITY_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SOURCE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opp-source-ref">Reference</Label>
                  <Input
                    id="opp-source-ref"
                    value={draft.sourceReference}
                    onChange={(e) => set("sourceReference", e.target.value)}
                    placeholder="Workshop name, referral or ticket reference"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void persist(false)} disabled={!canSave || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save opportunity
          </Button>
          {convertible && !signedOut ? (
            <Button
              variant="default"
              onClick={() => void continueToCanvas()}
              disabled={converting || saving}
            >
              {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {convertedUseCaseId ? "Continue to Studio Canvas" : "Continue to Studio Canvas"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => (dirty ? setCancelOpen(true) : navigate({ to: "/opportunities" }))}
          >
            Cancel
          </Button>
          {autosaveState === "idle" ? (
            <span className="text-xs text-muted-foreground">
              Autosaves once the problem has a name
            </span>
          ) : (
            <AutosaveStatus state={autosaveState} savedAt={lastSavedAt} />
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Capture quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={completion.percent} aria-label="Capture completeness" />
            <p className="text-sm text-muted-foreground">{completion.percent}% captured</p>
            {missingPrompts.length > 0 && (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {missingPrompts.map((f) => (
                  <li key={f.key as string}>
                    <span className="font-medium text-foreground">{f.label}</span>
                    <span className="block text-xs">{f.prompt}</span>
                  </li>
                ))}
              </ul>
            )}
            <Separator />
            <p className="text-xs text-muted-foreground">
              {convertible
                ? "Ready to open Studio Canvas from this problem."
                : "Add the pain point and desired outcome before designing a solution."}
            </p>
            {convertible && !signedOut ? (
              <Button
                className="w-full"
                size="sm"
                onClick={() => void continueToCanvas()}
                disabled={converting || saving}
              >
                {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Open Studio Canvas
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {(duplicates.repository.length > 0 || duplicates.opportunities.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Related patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {duplicates.repository.map((d) => (
                <div key={d.slug} className="rounded-md border border-border p-2">
                  <p className="font-medium text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Repository · {d.reason}
                    {d.slug ? (
                      <>
                        {" · "}
                        <Link
                          to="/use-cases/$slug"
                          params={{ slug: d.slug }}
                          className="underline-offset-2 hover:underline"
                        >
                          View
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              ))}
              {duplicates.opportunities.map((d) => (
                <div key={d.id} className="rounded-md border border-border p-2">
                  <p className="font-medium text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground">Workspace · {d.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" /> Clarification assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Suggestions appear as drafts. Nothing is written into your form until you Apply.
            </p>
            <AiSafetyNotice what="Each suggestion below" />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setPiiOpen(true)}
              disabled={assistLoading}
            >
              {assistLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suggest clarifications
            </Button>
            {suggestions && (
              <div className="space-y-3">
                {suggestions.refinedProblemStatement ? (
                  <AiDraftSuggestion
                    title="Sharper problem statement"
                    body={suggestions.refinedProblemStatement}
                    reason="Rewording for clarity from your pain and outcome text"
                    source="AI assistant · enrichOpportunity"
                    applyLabel="Apply to pain point"
                    onApply={() => {
                      set("painPoint", suggestions.refinedProblemStatement!.trim());
                      toast.success("Applied AI draft to pain point");
                    }}
                  />
                ) : null}
                {suggestions.clarifyingQuestions?.length
                  ? suggestions.clarifyingQuestions.map((q, i) => (
                      <AiDraftSuggestion
                        key={`q-${i}`}
                        title="Clarifying question"
                        body={q}
                        reason="Missing information the assistant thinks would strengthen capture"
                        source="AI assistant · enrichOpportunity"
                        applyLabel="Append to pain point"
                        onApply={() => {
                          set("painPoint", `${draft.painPoint}\n\nOpen question: ${q}`.trim());
                          toast.success("Appended clarifying question");
                        }}
                      />
                    ))
                  : null}
                {suggestions.suggestedKpis?.length
                  ? suggestions.suggestedKpis.map((k, i) => (
                      <AiDraftSuggestion
                        key={`k-${i}`}
                        title="Possible measure"
                        body={k}
                        reason="Suggested KPI derived from the stated outcome"
                        source="AI assistant · enrichOpportunity"
                        applyLabel="Append to outcome"
                        onApply={() => {
                          set("desiredOutcome", `${draft.desiredOutcome}\n\nMeasure: ${k}`.trim());
                          toast.success("Appended measure to outcome");
                        }}
                      />
                    ))
                  : null}
                {suggestions.suggestedRisks?.length
                  ? suggestions.suggestedRisks.map((r, i) => (
                      <AiDraftSuggestion
                        key={`r-${i}`}
                        title="Possible risk / constraint"
                        body={r}
                        reason="Risk themes inferred from the problem framing"
                        source="AI assistant · enrichOpportunity"
                        applyLabel="Apply to constraints"
                        onApply={() => {
                          set("constraints", `${draft.constraints}\n${r}`.trim());
                          toast.success("Applied to constraints");
                        }}
                      />
                    ))
                  : null}
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Discard unsaved changes?"
        description="Anything you have typed since the last save will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          setDirty(false);
          navigate({ to: "/opportunities" });
        }}
      />

      <ConfirmDialog
        open={piiOpen}
        onOpenChange={setPiiOpen}
        title="Send text to external AI?"
        description="The clarification assistant sends your problem title and description to an external AI service. Remove personal data, secrets, credentials and confidential identifiers before continuing. Suggestions remain drafts until you Apply them."
        confirmLabel="I understand — continue"
        onConfirm={() => {
          setPiiOpen(false);
          void runAssist();
        }}
      />
    </div>
  );
}
