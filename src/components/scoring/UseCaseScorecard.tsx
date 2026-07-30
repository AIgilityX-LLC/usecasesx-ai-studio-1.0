/**
 * Scorecard workspace for one use case.
 *
 * Left: the configured criteria and scales. Right: the live, deterministic
 * explanation from the same engine the server uses. Saving recalculates
 * server-side and appends an immutable result — earlier results are kept and
 * stay attributable to the definition version that produced them.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  GitCompareArrows,
  History,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  CardSkeleton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  StatusChip,
} from "@/components/ui-kit";
import { PriorityScore } from "@/components/scoring/PriorityScore";
import { ScoreCompare } from "@/components/scoring/ScoreCompare";
import { ScoreExplanation } from "@/components/scoring/ScoreExplanation";
import {
  getScorecardStateFn,
  recordScoreFn,
  suggestScoreEvidenceFn,
} from "@/lib/scoring.functions";
import { calculateScore, type Responses, type ScoreResult } from "@/lib/scoring/model";

type EvidenceSuggestion = {
  evidenceToGather: string[];
  draftJustification: string;
  confidence: "low" | "medium" | "high";
};

export function UseCaseScorecard({ id }: { id: string }) {
  const record = useServerFn(recordScoreFn);
  const suggestEvidence = useServerFn(suggestScoreEvidenceFn);
  const [responses, setResponses] = useState<Responses | null>(null);
  const [evidence, setEvidence] = useState<Record<string, string> | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, EvidenceSuggestion>>({});
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  const [showMissing, setShowMissing] = useState(false);

  const query = useQuery({
    queryKey: ["scorecard", id],
    queryFn: () => getScorecardStateFn({ data: { id } }),
  });

  const definition = query.data?.definition ?? null;
  const results = query.data?.results ?? [];
  const latest = results[0] ?? null;

  // Seed the form from the most recent result so re-scoring starts where the
  // last reviewer left off, without ever mutating that stored result.
  const current: Responses = useMemo(() => {
    if (responses) return responses;
    return (latest?.responses as Responses) ?? {};
  }, [responses, latest]);

  const live: ScoreResult | null = useMemo(
    () => (definition ? calculateScore(definition, current) : null),
    [definition, current],
  );

  const currentEvidence: Record<string, string> = useMemo(() => {
    if (evidence) return evidence;
    return (latest?.evidence as Record<string, string>) ?? {};
  }, [evidence, latest]);

  /**
   * Comparison always runs baseline (the selected older result) → latest, so
   * "up" consistently means the score improved over time.
   */
  const comparePair = useMemo(() => {
    if (!compareId || !latest || compareId === latest.id) return null;
    const baseline = results.find((r) => r.id === compareId);
    if (!baseline?.result || !latest.result) return null;
    return {
      from: {
        id: baseline.id,
        label: `${new Date(baseline.createdAt).toLocaleString()} (${baseline.scorecardSlug} v${baseline.scorecardVersion})`,
        result: baseline.result,
      },
      to: {
        id: latest.id,
        label: `Latest — ${new Date(latest.createdAt).toLocaleString()}`,
        result: latest.result,
      },
    };
  }, [compareId, latest, results]);

  const viewedResult = viewing ? (results.find((r) => r.id === viewing)?.result ?? null) : null;

  if (query.isLoading) {
    return <CardSkeleton />;
  }
  if (query.isError) {
    return (
      <ErrorState
        title="Scorecard unavailable"
        description="We could not load the scoring model for this use case."
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!query.data || !definition) {
    return (
      <EmptyState
        title="Use case not found"
        description="It may have been removed, or it belongs to another workspace."
      />
    );
  }

  function setAnswer(criterionId: string, value: number) {
    setResponses({ ...current, [criterionId]: value });
  }

  function setEvidenceFor(criterionId: string, value: string) {
    setEvidence({ ...currentEvidence, [criterionId]: value });
  }

  /** Ask AI what evidence would support the criteria that are still unanswered. */
  async function requestSuggestions() {
    const targets = (live?.missing ?? []).map((m) => m.criterionId).slice(0, 40);
    if (targets.length === 0) {
      toast.info("Every criterion is answered — nothing left to gather evidence for.");
      return;
    }
    setSuggesting(true);
    try {
      const res = await suggestEvidence({ data: { id, criterionIds: targets } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const next: Record<string, EvidenceSuggestion> = {};
      for (const item of res.data.items) {
        next[item.criterionId] = {
          evidenceToGather: item.evidenceToGather,
          draftJustification: item.draftJustification,
          confidence: item.confidence,
        };
      }
      setSuggestions(next);
      setOpenQuestions(res.data.openQuestions ?? []);
      setShowMissing(true);
      toast.success("Evidence suggestions ready. Review before you answer.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not generate evidence suggestions.",
      );
    } finally {
      setSuggesting(false);
    }
  }

  function attemptSave() {
    if (live?.incomplete) {
      setConfirmIncomplete(true);
      return;
    }
    void save();
  }

  async function save() {
    setSaving(true);
    try {
      const res = await record({
        data: {
          id,
          responses: current,
          evidence: currentEvidence,
          note: note.trim() || undefined,
        },
      });
      toast.success(
        res.result.incomplete ? "Score recorded and flagged as incomplete." : "Score recorded.",
      );
      setNote("");
      setResponses(null);
      setEvidence(null);
      setViewing(null);
      setConfirmIncomplete(false);
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the score.");
    } finally {
      setSaving(false);
    }
  }

  const answeredCount = Object.keys(current).length;
  const totalCount = definition.dimensions.reduce((s, d) => s + d.criteria.length, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{definition.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{definition.description}</p>
            <p className="text-xs text-muted-foreground">
              Version {definition.version} · {answeredCount} of {totalCount} criteria answered
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Current priority
              </span>
              <PriorityScore
                score={
                  live
                    ? {
                        riskAdjusted: live.riskAdjusted,
                        completeness: live.completeness,
                        confidence: live.confidence,
                        recommendation: live.recommendation?.id ?? null,
                        incomplete: live.incomplete,
                      }
                    : null
                }
              />
            </div>
            {live && live.missing.length > 0 && (
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                <p className="flex items-start gap-2 text-sm">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">
                      {live.missing.length} criterion{live.missing.length === 1 ? "" : "s"} still
                      unanswered.
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {live.incomplete
                        ? `Below the ${Math.round(definition.minimumCompleteness * 100)}% completeness threshold — any score recorded now will be flagged as provisional.`
                        : "The score is above the completeness threshold, but the gaps still lower confidence."}
                    </span>
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMissing((v) => !v)}
                  >
                    {showMissing ? "Hide" : "Show"} unanswered criteria
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void requestSuggestions()}
                    disabled={suggesting}
                  >
                    {suggesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    Suggest supporting evidence
                  </Button>
                </div>
                {showMissing && (
                  <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {live.missing.map((m) => (
                      <li key={m.criterionId}>
                        {m.dimensionLabel} — {m.label}
                      </li>
                    ))}
                  </ul>
                )}
                {openQuestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">
                      AI needs answers to these before it can help further
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {openQuestions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Accordion
          type="multiple"
          defaultValue={[definition.dimensions[0]?.id ?? ""]}
          className="space-y-2"
        >
          {definition.dimensions.map((dim) => {
            const dimAnswered = dim.criteria.filter(
              (c) => typeof current[c.id] === "number",
            ).length;
            return (
              <AccordionItem
                key={dim.id}
                value={dim.id}
                className="rounded-lg border border-border bg-card px-4"
              >
                <AccordionTrigger className="text-left">
                  <span className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                    <span className="font-medium">{dim.label}</span>
                    <StatusChip tone={dimAnswered === dim.criteria.length ? "success" : "neutral"}>
                      {dimAnswered}/{dim.criteria.length}
                    </StatusChip>
                    <span className="text-xs font-normal text-muted-foreground">
                      weight {dim.weight}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-4">
                  <p className="text-sm text-muted-foreground">{dim.intent}</p>
                  {dim.criteria.map((crit) => {
                    const unanswered = typeof current[crit.id] !== "number";
                    const suggestion = suggestions[crit.id];
                    return (
                      <fieldset
                        key={crit.id}
                        className={
                          unanswered && showMissing
                            ? "space-y-2 rounded-md border border-dashed border-border p-3"
                            : "space-y-2"
                        }
                      >
                        <legend className="text-sm font-medium">
                          {crit.label}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            weight {crit.weight}
                            {crit.inverse ? " · lower exposure scores higher" : ""}
                          </span>
                          {unanswered && (
                            <StatusChip tone="warning" className="ml-2 align-middle">
                              unanswered
                            </StatusChip>
                          )}
                        </legend>
                        {crit.help && <p className="text-xs text-muted-foreground">{crit.help}</p>}
                        <RadioGroup
                          value={
                            typeof current[crit.id] === "number"
                              ? String(current[crit.id])
                              : undefined
                          }
                          onValueChange={(v) => setAnswer(crit.id, Number(v))}
                          className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3"
                        >
                          {crit.scale.map((opt) => {
                            const optId = `${crit.id}-${opt.value}`;
                            return (
                              <div key={optId} className="flex items-center gap-2">
                                <RadioGroupItem id={optId} value={String(opt.value)} />
                                <Label
                                  htmlFor={optId}
                                  className="cursor-pointer text-xs font-normal leading-tight"
                                >
                                  {opt.label}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                        {suggestion && (
                          <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-xs">
                            <p className="flex items-center gap-1.5 font-medium">
                              <Sparkles className="h-3.5 w-3.5" aria-hidden />
                              Evidence to gather
                              <StatusChip tone="neutral">
                                {suggestion.confidence} confidence
                              </StatusChip>
                            </p>
                            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                              {suggestion.evidenceToGather.map((e) => (
                                <li key={e}>{e}</li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setEvidenceFor(crit.id, suggestion.draftJustification)
                                }
                              >
                                Use draft justification
                              </Button>
                              <span className="text-muted-foreground">
                                AI never sets the answer — you still choose the rating.
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label
                            htmlFor={`evidence-${crit.id}`}
                            className="text-xs font-normal text-muted-foreground"
                          >
                            Evidence / justification (optional)
                          </Label>
                          <Textarea
                            id={`evidence-${crit.id}`}
                            rows={2}
                            maxLength={2000}
                            value={currentEvidence[crit.id] ?? ""}
                            placeholder="What evidence supports this answer?"
                            onChange={(e) => setEvidenceFor(crit.id, e.target.value)}
                          />
                        </div>
                      </fieldset>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="score-note">Note for this scoring round (optional)</Label>
              <Input
                id="score-note"
                value={note}
                maxLength={500}
                placeholder="e.g. Scored with the data team after the discovery workshop"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={attemptSave} disabled={saving || answeredCount === 0}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                )}
                Record this score
              </Button>
              {(responses || evidence) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setResponses(null);
                    setEvidence(null);
                  }}
                  disabled={saving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                  Reset to last recorded
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              The score is recalculated on the server from your answers and stored as a new,
              read-only result. Previous results are never overwritten.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {viewedResult ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Historical result</p>
              <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
                Back to live score
              </Button>
            </div>
            <ScoreExplanation result={viewedResult} />
          </>
        ) : live ? (
          <>
            <p className="text-sm font-medium">
              {answeredCount === 0 ? "Preview" : "Live score"}{" "}
              <span className="font-normal text-muted-foreground">
                — updates as you answer, saved only when you record it
              </span>
            </p>
            <ScoreExplanation result={live} />
          </>
        ) : null}

        {comparePair && <ScoreCompare from={comparePair.from} to={comparePair.to} />}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" aria-hidden /> Recorded results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No score recorded yet. Answer the criteria and record the first result.
              </p>
            ) : (
              <ul className="space-y-2">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setViewing(r.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>
                        <span className="font-medium tabular-nums">
                          {r.riskAdjusted ?? "—"}/100
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()} · {r.scorecardSlug} v
                          {r.scorecardVersion}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        {r.completeness < definition.minimumCompleteness && (
                          <StatusChip tone="warning">incomplete</StatusChip>
                        )}
                        <StatusChip tone="neutral">
                          {Math.round(r.completeness * 100)}% complete
                        </StatusChip>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-3 px-3 pt-1">
                      {results.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCompareId(compareId === r.id ? null : r.id)}
                          className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <GitCompareArrows className="h-3 w-3" aria-hidden />
                          {compareId === r.id ? "Stop comparing" : "Compare with latest"}
                        </button>
                      )}
                      {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmIncomplete}
        onOpenChange={setConfirmIncomplete}
        title="Record a provisional score?"
        description={
          live
            ? `${live.missing.length} criterion${live.missing.length === 1 ? " is" : "s are"} unanswered, so completeness is ${Math.round(live.completeness * 100)}% — below the ${Math.round(definition.minimumCompleteness * 100)}% threshold. The result will be stored and clearly flagged as incomplete, and confidence will read "${live.confidence}".`
            : undefined
        }
        confirmLabel="Record as provisional"
        cancelLabel="Keep answering"
        busy={saving}
        onConfirm={() => void save()}
      />
    </div>
  );
}
