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
import { CardSkeleton, ConfirmDialog, EmptyState, ErrorState, StatusChip } from "@/components/ui-kit";
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
      const next: Record<string, EvidenceSuggestion> = {};
      for (const item of res.output.items) {
        next[item.criterionId] = {
          evidenceToGather: item.evidenceToGather,
          draftJustification: item.draftJustification,
          confidence: item.confidence,
        };
      }
      setSuggestions(next);
      setOpenQuestions(res.output.openQuestions ?? []);
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
                  {dim.criteria.map((crit) => (
                    <fieldset key={crit.id} className="space-y-2">
                      <legend className="text-sm font-medium">
                        {crit.label}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          weight {crit.weight}
                          {crit.inverse ? " · lower exposure scores higher" : ""}
                        </span>
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
                    </fieldset>
                  ))}
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
              <Button onClick={() => void save()} disabled={saving || answeredCount === 0}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="mr-2 h-4 w-4" aria-hidden />
                )}
                Record this score
              </Button>
              {responses && (
                <Button variant="ghost" onClick={() => setResponses(null)} disabled={saving}>
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
                    {r.note && <p className="px-3 pt-1 text-xs text-muted-foreground">{r.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
