import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, X } from "lucide-react";
import { AiSafetyNotice } from "@/components/ai/AiSafetyNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  OPPORTUNITY_SOURCES,
  opportunityDraftKey,
  readLocalDraft,
  SOURCE_LABELS,
  URGENCIES,
  URGENCY_LABELS,
  writeLocalDraft,
  type OpportunityDraft,
  type OpportunitySource,
  type StoredLocalDraft,
} from "@/lib/opportunities";

import {
  findSimilarOpportunitiesFn,
  recordOpportunityAssistFn,
  saveOpportunityFn,
} from "@/lib/opportunities.functions";
import { enrichOpportunityFn } from "@/lib/ai.functions";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { isUnauthorizedError, signInHref, SIGN_IN_TO_SAVE } from "@/lib/auth-errors";

type SavedRow = { id: string; title: string; status: string };

type Suggestions = {
  refinedProblemStatement?: string;
  suggestedKpis?: string[];
  suggestedRisks?: string[];
  clarifyingQuestions?: string[];
};

export function OpportunityForm({
  opportunityId,
  initial,
  sourceUseCaseId,
  serverUpdatedAt,
  onSaved,
}: {
  opportunityId?: string | null;
  initial?: OpportunityDraft;
  sourceUseCaseId?: string | null;
  /** `updated_at` of the saved record, used to detect draft conflicts. */
  serverUpdatedAt?: string | null;
  onSaved?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const signedOut = session === null;
  const save = useServerFn(saveOpportunityFn);
  const findSimilar = useServerFn(findSimilarOpportunitiesFn);
  const enrich = useServerFn(enrichOpportunityFn);
  const recordAssist = useServerFn(recordOpportunityAssistFn);

  const [draft, setDraft] = useState<OpportunityDraft>(() => initial ?? emptyDraft());
  const [id, setId] = useState<string | null>(opportunityId ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [duplicates, setDuplicates] = useState<{
    opportunities: SavedRow[];
    repository: { slug: string; title: string }[];
  }>({ opportunities: [], repository: [] });
  const [assistLoading, setAssistLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [stakeholderInput, setStakeholderInput] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const completion = useMemo(() => completionOf(draft), [draft]);
  const canSave = draft.title.trim().length >= 3;
  const draftKey = opportunityDraftKey(id);

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
      // A signed-out visitor cannot persist: keep the local draft, say so
      // plainly and offer the way back instead of failing silently.
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

  /* --- non-blocking duplicate hints --------------------------------------- */
  useEffect(() => {
    const title = draft.title.trim();
    if (title.length < 6) {
      setDuplicates({ opportunities: [], repository: [] });
      return;
    }
    const t = setTimeout(() => {
      findSimilar({ data: { title, excludeId: id } })
        .then(setDuplicates)
        .catch(() => setDuplicates({ opportunities: [], repository: [] }));
    }, 700);
    return () => clearTimeout(t);
  }, [draft.title, findSimilar, id]);

  /* --- AI clarification (suggestions only, never overwrites) -------------- */
  async function runAssist() {
    const description = [draft.painPoint, draft.baseline, draft.desiredOutcome]
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
        {/* Essentials — the only required framing */}

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

            {(duplicates.opportunities.length > 0 || duplicates.repository.length > 0) && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Possibly related — you can carry on regardless</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {duplicates.opportunities.map((d) => (
                    <li key={d.id}>
                      Opportunity: <span className="text-foreground">{d.title}</span> ({d.status})
                    </li>
                  ))}
                  {duplicates.repository.map((d) => (
                    <li key={d.slug}>
                      Repository: <span className="text-foreground">{d.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progressive disclosure — everything below is optional */}
        <Accordion type="multiple" className="rounded-lg border border-border px-4">
          <AccordionItem value="context">
            <AccordionTrigger>Where it happens</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="opp-process">Affected process</Label>
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
                <Label htmlFor="opp-objective">Strategic objective it supports</Label>
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
            <AccordionTrigger>Who is involved</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
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

          <AccordionItem value="evidence">
            <AccordionTrigger>Baseline, urgency and evidence</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="opp-baseline">Today&apos;s baseline</Label>
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

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void persist(false)} disabled={!canSave || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save opportunity
          </Button>
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

      {/* Side rail: capture quality + AI clarification */}
      <aside className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Capture quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={completion.percent} aria-label="Capture completeness" />
            <p className="text-sm text-muted-foreground">{completion.percent}% captured</p>
            {completion.missing.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {completion.missing.slice(0, 5).map((f) => (
                  <li key={f.key as string}>· {f.label}</li>
                ))}
              </ul>
            )}
            <Separator />
            <p className="text-xs text-muted-foreground">
              {isConvertible(draft)
                ? "Ready to design a use case from this problem."
                : "Add the pain point and desired outcome before designing a solution."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" /> Clarification assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Suggestions appear here as prompts. Your words are never replaced.
            </p>
            <AiSafetyNotice what="Each suggestion below" />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void runAssist()}
              disabled={assistLoading}
            >
              {assistLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suggest clarifications
            </Button>
            {suggestions && (
              <div className="space-y-3 text-sm">
                {suggestions.clarifyingQuestions?.length ? (
                  <div>
                    <p className="font-medium">Questions to answer</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {suggestions.clarifyingQuestions.map((q, i) => (
                        <li key={i}>· {q}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {suggestions.suggestedKpis?.length ? (
                  <div>
                    <p className="font-medium">Possible measures</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {suggestions.suggestedKpis.map((k, i) => (
                        <li key={i}>· {k}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {suggestions.refinedProblemStatement ? (
                  <div>
                    <p className="font-medium">Sharper problem statement</p>
                    <p className="text-muted-foreground">{suggestions.refinedProblemStatement}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        set(
                          "painPoint",
                          `${draft.painPoint}\n\n${suggestions.refinedProblemStatement}`.trim(),
                        )
                      }
                    >
                      Append to my description
                    </Button>
                  </div>
                ) : null}
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
    </div>
  );
}
