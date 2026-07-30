/**
 * AI Use Case Studio™ — guided design wizard.
 *
 * Nine steps from a captured opportunity to a business-ready use case.
 * Each step saves on its own, so back navigation never loses data. AI
 * assistance is optional, provenance-stamped and accept/reject only — a
 * failed AI call never blocks completion.
 */

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton, ErrorState, StatusChip } from "@/components/ui-kit";

import {
  WIZARD_STEPS,
  STEP_IDS,
  VISIBILITY_LABELS,
  USE_CASE_VISIBILITIES,
  isAssistable,
  isStepComplete,
  progressOf,
  validateAll,
  validateStep,
  valuesFor,
  type FieldIssue,
  type FieldValue,
  type StepValues,
  type UseCaseVisibility,
  type WizardField,
  type WizardState,
} from "@/lib/studio-wizard";
import {
  completeWizardFn,
  getWizardUseCaseFn,
  saveWizardStepFn,
  setWizardMetaFn,
} from "@/lib/studio-wizard.functions";
import { enrichOpportunityFn } from "@/lib/ai.functions";

type Suggestion = { key: string; label: string; values: string[] };

export function UseCaseWizard({ id }: { id: string }) {
  const load = useServerFn(getWizardUseCaseFn);
  const saveStep = useServerFn(saveWizardStepFn);
  const complete = useServerFn(completeWizardFn);
  const setMeta = useServerFn(setWizardMetaFn);
  const assist = useServerFn(enrichOpportunityFn);

  const query = useQuery({
    queryKey: ["studio-wizard", id],
    queryFn: () => load({ data: { id } }),
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<WizardState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [assisting, setAssisting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [provenance, setProvenance] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<UseCaseVisibility | null>(null);
  const [completedVersion, setCompletedVersion] = useState<number | null>(null);

  const record = query.data;
  const wizardState: WizardState = state ?? record?.wizardState ?? {};
  const step = WIZARD_STEPS[stepIndex];
  const stepValues = valuesFor(wizardState, step.id);
  const stepIssues = validateStep(wizardState, step.id);
  const allIssues = validateAll(wizardState);
  const percent = progressOf(wizardState);

  // First render positions on the step the author last worked on.
  const initialised = state !== null;
  if (record && !initialised) {
    const idx = STEP_IDS.indexOf(record.currentStep ?? "opportunity");
    if (idx > 0 && stepIndex === 0) setStepIndex(idx);
    setState(record.wizardState ?? {});
    setVisibility((record.visibility as UseCaseVisibility) ?? "workspace");
  }

  const setValue = useCallback((key: string, value: FieldValue) => {
    setState((prev) => {
      const base: WizardState = prev ? { ...prev } : {};
      const current = base[step.id] ?? {};
      base[step.id] = { ...current, [key]: value };
      return base;
    });
  }, [step.id]);

  const persist = useCallback(
    async (nextStepId?: string) => {
      setSaving(true);
      try {
        await saveStep({
          data: {
            id,
            stepId: step.id,
            values: (wizardState[step.id] ?? {}) as StepValues,
            nextStep: nextStepId,
          },
        });
        return true;
      } catch (e) {
        console.error(e);
        toast.error("We could not save this step. Your answers are still on screen — try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [id, saveStep, step.id, wizardState],
  );

  async function goTo(index: number) {
    if (index === stepIndex) return;
    const target = WIZARD_STEPS[index];
    const ok = await persist(target.id);
    if (!ok) return;
    setShowIssues(false);
    setSuggestions(null);
    setStepIndex(index);
  }

  async function handleNext() {
    if (stepIssues.length > 0) {
      setShowIssues(true);
      // Still save what has been typed — nothing is lost by an incomplete step.
      await persist();
      return;
    }
    if (stepIndex === WIZARD_STEPS.length - 1) {
      const ok = await persist();
      if (ok) setReviewing(true);
      return;
    }
    await goTo(stepIndex + 1);
  }

  async function handleAssist() {
    if (!record) return;
    setAssisting(true);
    setSuggestions(null);
    try {
      const res = await assist({
        data: {
          title: (valuesFor(wizardState, "opportunity").title as string) || record.title,
          description:
            (valuesFor(wizardState, "opportunity").problemStatement as string) ||
            "No problem statement captured yet.",
          entity: { type: "use_case", id },
        },
      });
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "The assistant is unavailable right now. You can continue without it.");
        return;
      }
      const d = res.data;
      const map: Record<string, Suggestion[]> = {
        solution: [
          { key: "proposedSolution", label: "Solution concept", values: [d.refinedSolutionConcept] },
        ],
        dataTechnology: [
          { key: "dataSources", label: "Data sources", values: d.suggestedDataRequirements },
        ],
        value: [{ key: "kpis", label: "KPIs", values: d.suggestedKpis }],
        risk: [{ key: "risks", label: "Key risks", values: d.suggestedRisks }],
      };
      setSuggestions(map[step.id] ?? []);
      setProvenance(
        res.provenance
          ? `AI-generated · ${res.provenance.model} · ${new Date(res.provenance.generatedAt).toLocaleString()}`
          : "AI-generated",
      );
    } catch (e) {
      console.error(e);
      toast.error("The assistant failed. This never blocks completing the use case.");
    } finally {
      setAssisting(false);
    }
  }

  function acceptSuggestion(s: Suggestion) {
    const field = step.fields.find((f) => f.key === s.key);
    if (!field) return;
    if (field.kind === "list") {
      const existing = Array.isArray(stepValues[s.key]) ? (stepValues[s.key] as string[]) : [];
      setValue(s.key, Array.from(new Set([...existing, ...s.values])));
    } else {
      setValue(s.key, s.values.join("\n"));
    }
    setSuggestions((prev) => (prev ?? []).filter((x) => x.key !== s.key));
    toast.success("Added to your draft. Edit it freely — it is yours now.");
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const res = await complete({ data: { id } });
      if (!res.ok) {
        setShowIssues(true);
        setReviewing(false);
        toast.error("Some required answers are still missing.");
        return;
      }
      setCompletedVersion(res.version);
      toast.success(`Use case completed as version ${res.version}.`);
      query.refetch();
    } catch (e) {
      console.error(e);
      toast.error("We could not complete the use case. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVisibility(next: UseCaseVisibility) {
    setVisibility(next);
    try {
      await setMeta({ data: { id, visibility: next } });
    } catch {
      toast.error("We could not update visibility.");
    }
  }

  const lineage = useMemo(() => {
    if (!record) return null;
    if (record.sourceOpportunityId) return "Converted from a captured opportunity";
    if (record.sourceUseCaseId) return "Customised from a repository use case";
    return "Created as a blank draft";
  }, [record]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
      </div>
    );
  }
  if (query.isError || !record) {
    return (
      <ErrorState
        title="We could not open that use case"
        description="It may have been removed, or it belongs to another workspace."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* -------------------------------------------------------- step rail */}
      <nav aria-label="Wizard steps" className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span aria-live="polite">{percent}%</span>
          </div>
          <Progress value={percent} className="mt-2" aria-label="Overall completion" />
        </div>
        <ol className="space-y-1">
          {WIZARD_STEPS.map((s, i) => {
            const done = isStepComplete(wizardState, s.id);
            const active = i === stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-secondary font-medium text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                    aria-hidden
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <Separator />

        <div className="space-y-2 px-1 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={record.completedAt ? "success" : "info"}>
              {record.completedAt ? "Defined" : "In design"}
            </StatusChip>
            <Badge variant="outline">v{completedVersion ?? record.version}</Badge>
          </div>
          {lineage && <p>{lineage}</p>}
          <div className="space-y-1 pt-2">
            <Label htmlFor="visibility" className="text-xs">
              Visibility
            </Label>
            <Select value={visibility ?? "workspace"} onValueChange={(v) => handleVisibility(v as UseCaseVisibility)}>
              <SelectTrigger id="visibility" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USE_CASE_VISIBILITIES.map((v) => (
                  <SelectItem key={v} value={v} className="text-xs">
                    {VISIBILITY_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {record.versions.length > 0 && (
            <p className="pt-2">
              {record.versions.length} completed version{record.versions.length === 1 ? "" : "s"} on
              record.
            </p>
          )}
        </div>
      </nav>

      {/* ------------------------------------------------------------ panel */}
      <div className="space-y-4">
        {reviewing ? (
          <ReviewPanel
            state={wizardState}
            issues={allIssues}
            saving={saving}
            completedVersion={completedVersion}
            onEdit={(stepId) => {
              setReviewing(false);
              setStepIndex(Math.max(0, STEP_IDS.indexOf(stepId)));
            }}
            onBack={() => setReviewing(false)}
            onComplete={handleComplete}
          />
        ) : (
          <Card>
            <CardHeader className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Step {stepIndex + 1} of {WIZARD_STEPS.length}
              </div>
              <CardTitle className="text-xl">{step.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{step.intent}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {showIssues && stepIssues.length > 0 && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
                >
                  <p className="font-medium">Before moving on, complete:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {stepIssues.map((i) => (
                      <li key={i.key}>{i.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {step.fields
                .filter((f) => !f.advanced)
                .map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={stepValues[field.key]}
                    invalid={showIssues && stepIssues.some((i) => i.key === field.key)}
                    onChange={(v) => setValue(field.key, v)}
                  />
                ))}

              {step.fields.some((f) => f.advanced) && (
                <div className="rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    aria-expanded={showAdvanced}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
                  >
                    More detail (optional)
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {showAdvanced && (
                    <div className="space-y-5 border-t border-border p-3">
                      {step.fields
                        .filter((f) => f.advanced)
                        .map((field) => (
                          <FieldControl
                            key={field.key}
                            field={field}
                            value={stepValues[field.key]}
                            onChange={(v) => setValue(field.key, v)}
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}

              {isAssistable(step.id) && (
                <div className="rounded-md border border-dashed border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Need a starting point?</p>
                      <p className="text-xs text-muted-foreground">
                        Optional AI suggestions. Nothing is written until you accept it.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAssist}
                      disabled={assisting}
                    >
                      {assisting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                      )}
                      Suggest
                    </Button>
                  </div>
                  {suggestions && suggestions.length > 0 && (
                    <ul className="mt-3 space-y-3">
                      {suggestions.map((s) => (
                        <li key={s.key} className="rounded-md bg-muted/50 p-3">
                          <p className="text-xs font-medium">{s.label}</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                            {s.values.map((v, i) => (
                              <li key={i}>{v}</li>
                            ))}
                          </ul>
                          {provenance && (
                            <p className="mt-2 text-[11px] text-muted-foreground">{provenance}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <Button type="button" size="sm" onClick={() => acceptSuggestion(s)}>
                              Accept
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSuggestions((prev) => (prev ?? []).filter((x) => x.key !== s.key))
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!reviewing && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => goTo(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0 || saving}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => persist()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                )}
                Save
              </Button>
              <Button type="button" onClick={handleNext} disabled={saving}>
                {stepIndex === WIZARD_STEPS.length - 1 ? "Review" : "Next"}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- controls */

function FieldControl({
  field,
  value,
  invalid,
  onChange,
}: {
  field: WizardField;
  value: FieldValue | undefined;
  invalid?: boolean;
  onChange: (value: FieldValue) => void;
}) {
  const describedBy = field.help ? `${field.key}-help` : undefined;
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {field.help && (
        <p id={describedBy} className="text-xs text-muted-foreground">
          {field.help}
        </p>
      )}

      {field.kind === "text" && (
        <Input
          id={field.key}
          value={text}
          placeholder={field.placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.kind === "textarea" && (
        <Textarea
          id={field.key}
          rows={4}
          value={text}
          placeholder={field.placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.kind === "select" && (
        <Select value={text} onValueChange={onChange}>
          <SelectTrigger id={field.key} aria-invalid={invalid || undefined}>
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.kind === "list" && (
        <ListInput
          id={field.key}
          items={list}
          placeholder={field.placeholder ?? "Add an entry and press Enter"}
          invalid={invalid}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function ListInput({
  id,
  items,
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  items: string[];
  placeholder: string;
  invalid?: boolean;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li key={`${item}-${i}`}>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
                aria-label={`Remove ${item}`}
              >
                {item}
                <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- review */

function ReviewPanel({
  state,
  issues,
  saving,
  completedVersion,
  onEdit,
  onBack,
  onComplete,
}: {
  state: WizardState;
  issues: FieldIssue[];
  saving: boolean;
  completedVersion: number | null;
  onEdit: (stepId: string) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Final review</CardTitle>
        <p className="text-sm text-muted-foreground">
          Check the answers below. Completing creates a versioned use case linked to its source.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {completedVersion !== null && (
          <div
            role="status"
            className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm"
          >
            Completed as version {completedVersion}. Further edits start the next version.
          </div>
        )}

        {issues.length > 0 && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <p className="font-medium">{issues.length} required answer(s) still missing:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {issues.map((i) => (
                <li key={`${i.stepId}-${i.key}`}>
                  {i.message}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => onEdit(i.stepId)}
                  >
                    Fix
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="space-y-4">
          {WIZARD_STEPS.map((s) => {
            const values = valuesFor(state, s.id);
            const answered = s.fields.filter((f) => {
              const v = values[f.key];
              return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim().length > 0;
            });
            return (
              <div key={s.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-sm font-semibold">{s.title}</dt>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(s.id)}>
                    Edit
                  </Button>
                </div>
                {answered.length === 0 ? (
                  <dd className="mt-1 text-sm text-muted-foreground">Nothing captured yet.</dd>
                ) : (
                  <dd className="mt-2 space-y-1.5 text-sm">
                    {answered.map((f) => {
                      const v = values[f.key];
                      return (
                        <div key={f.key}>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {f.label}
                          </span>
                          <p className="whitespace-pre-wrap">
                            {Array.isArray(v) ? v.join(", ") : v}
                          </p>
                        </div>
                      );
                    })}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            Back to steps
          </Button>
          <Button type="button" onClick={onComplete} disabled={saving || issues.length > 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Complete use case
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
