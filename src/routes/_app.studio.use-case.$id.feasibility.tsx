import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import * as studioRepo from "@/lib/domain/studio.repository";
import { toUserMessage } from "@/lib/domain/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Save } from "lucide-react";

type PillarKey = "desirability" | "viability" | "feasibility" | "governability" | "sustainability";

const PILLARS: { key: PillarKey; label: string; description: string; questions: string[] }[] = [
  {
    key: "desirability",
    label: "Desirability",
    description: "Will users actually want and adopt this?",
    questions: [
      "Is the problem important to users?",
      "Is there clear demand?",
      "Will users adopt the AI-enabled solution?",
    ],
  },
  {
    key: "viability",
    label: "Viability",
    description: "Does it make strategic and economic sense?",
    questions: [
      "Is this aligned with strategy?",
      "Is there clear ROI or public value?",
      "Is funding likely?",
    ],
  },
  {
    key: "feasibility",
    label: "Feasibility",
    description: "Can we actually build it with current data, tech, and capability?",
    questions: [
      "Is required data available?",
      "Is technology maturity sufficient?",
      "Does the organization have capability?",
    ],
  },
  {
    key: "governability",
    label: "Governability",
    description: "Can risk, oversight, and controls be managed?",
    questions: [
      "Are legal, ethical, privacy, cyber, and procurement risks manageable?",
      "Is human oversight defined?",
      "Are controls identifiable?",
    ],
  },
  {
    key: "sustainability",
    label: "Sustainability",
    description: "Will it survive and improve after launch?",
    questions: [
      "Can the solution be maintained?",
      "Is there ownership after launch?",
      "Are drift monitoring and continuous improvement considered?",
    ],
  },
];

type Answers = Record<PillarKey, number[]>;

function emptyAnswers(): Answers {
  return PILLARS.reduce((acc, p) => {
    acc[p.key] = p.questions.map(() => 3);
    return acc;
  }, {} as Answers);
}

function pillarScore(values: number[]): number {
  if (!values.length) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(avg * 20); // 0–100
}

function recommendation(total: number): { label: string; tone: string; next: string } {
  if (total >= 80)
    return {
      label: "Pursue",
      tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
      next: "Generate Blueprint",
    };
  if (total >= 60)
    return {
      label: "Refine",
      tone: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      next: "Refine Use Case",
    };
  if (total >= 40)
    return {
      label: "Hold",
      tone: "bg-orange-500/15 text-orange-600 border-orange-500/30",
      next: "Park for Review",
    };
  return {
    label: "Reject",
    tone: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    next: "Archive Use Case",
  };
}

export const Route = createFileRoute("/_app/studio/use-case/$id/feasibility")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Feasibility Scoring — AI Use Case Studio" },
      {
        name: "description",
        content:
          "Score AI use cases across desirability, viability, feasibility, governability, and sustainability.",
      },
    ],
  }),
  component: FeasibilityPage,
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-destructive">{(error as Error).message}</div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">Use case not found.</div>,
});

function FeasibilityPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useCase, setUseCase] = useState<{ id: string; title: string; board_id: string } | null>(
    null,
  );
  const [answers, setAnswers] = useState<Answers>(emptyAnswers());
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      const uc = await studioRepo
        .getStudioUseCase<{
          id: string;
          title: string;
          board_id: string;
        }>(id, "id, title, board_id")
        .catch(() => null);
      if (!active) return;
      if (!uc) {
        toast.error("Use case not found.");
        setLoading(false);
        return;
      }
      setUseCase(uc);

      const existing = await studioRepo
        .getLatestFeasibility(
          id,
          "id, desirability_score, viability_score, feasibility_score, governability_score, sustainability_score, notes",
        )
        .catch(() => null);
      if (existing) {
        // Reconstruct rough per-question answers from pillar score (uniform fill).
        const restore = emptyAnswers();
        (Object.keys(restore) as PillarKey[]).forEach((k) => {
          const s = (existing as unknown as Record<string, number | null>)[`${k}_score`];
          if (typeof s === "number") {
            const perQ = Math.max(1, Math.min(5, Math.round(s / 20)));
            restore[k] = restore[k].map(() => perQ);
          }
        });
        setAnswers(restore);
        setNotes(existing.notes ?? "");
        setExistingId(existing.id);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const pillarScores = useMemo(() => {
    return PILLARS.reduce(
      (acc, p) => {
        acc[p.key] = pillarScore(answers[p.key]);
        return acc;
      },
      {} as Record<PillarKey, number>,
    );
  }, [answers]);

  const totalScore = useMemo(() => {
    const vals = Object.values(pillarScores);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [pillarScores]);

  const rec = recommendation(totalScore);

  const radarData = PILLARS.map((p) => ({ pillar: p.label, score: pillarScores[p.key] }));

  function setAnswer(pillar: PillarKey, qIdx: number, value: number) {
    setAnswers((prev) => {
      const next = { ...prev, [pillar]: [...prev[pillar]] };
      next[pillar][qIdx] = value;
      return next;
    });
  }

  async function handleSave(next?: "blueprint" | "stay") {
    if (!useCase) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      navigate({ to: "/auth" });
      return;
    }

    const payload = {
      use_case_id: useCase.id,
      created_by: user.id,
      desirability_score: pillarScores.desirability,
      viability_score: pillarScores.viability,
      feasibility_score: pillarScores.feasibility,
      governability_score: pillarScores.governability,
      sustainability_score: pillarScores.sustainability,
      total_score: totalScore,
      recommendation: rec.label,
      notes: notes.trim() || null,
    };

    let savedId: string;
    try {
      savedId = await studioRepo.saveFeasibility({ existingId, payload });
    } catch (e) {
      setSaving(false);
      toast.error(toUserMessage(e, "We could not save these scores."));
      return;
    }
    setSaving(false);
    if (!existingId) setExistingId(savedId);
    toast.success("Feasibility scores saved.");
    if (next === "blueprint")
      navigate({ to: "/blueprint", search: { useCase: useCase.id } as never });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!useCase) {
    return <div className="p-12 text-center text-muted-foreground">Use case not found.</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/ai-use-case-studio"
            className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            ← AI Use Case Studio
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Feasibility Scoring
          </h1>
          <p className="mt-1 text-muted-foreground">{useCase.title}</p>
        </div>
        <Badge
          className={"border px-3 py-1 text-xs font-bold uppercase tracking-widest " + rec.tone}
          variant="outline"
        >
          {rec.label} · {totalScore}/100
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Pillar cards */}
        <div className="space-y-5">
          {PILLARS.map((p) => (
            <Card key={p.key}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div>
                  <CardTitle className="text-lg">{p.label}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Pillar score
                  </div>
                  <div className="text-2xl font-bold text-primary">{pillarScores[p.key]}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {p.questions.map((q, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground">{q}</span>
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold text-foreground">
                        {answers[p.key][idx]}/5
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() => setAnswer(p.key, idx, v)}
                          className={
                            "h-9 flex-1 rounded-md border text-xs font-bold transition-colors " +
                            (answers[p.key][idx] === v
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-secondary")
                          }
                          aria-label={`Score ${v}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(answers[p.key][idx] / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes &amp; assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Document key assumptions, evidence, and risks influencing these scores…"
                className="w-full rounded-md border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sticky summary panel */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Feasibility profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="pillar"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      stroke="hsl(var(--border))"
                    />
                    <Radar
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {PILLARS.map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>{p.label}</span>
                      <span className="text-foreground">{pillarScores[p.key]}/100</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pillarScores[p.key]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Total feasibility
              </div>
              <div className="text-5xl font-bold text-foreground">
                {totalScore}
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Badge
                className={
                  "border px-3 py-1 text-xs font-bold uppercase tracking-widest " + rec.tone
                }
                variant="outline"
              >
                Recommendation: {rec.label}
              </Badge>
              <p className="text-xs text-muted-foreground">
                80–100 Pursue · 60–79 Refine · 40–59 Hold · &lt;40 Reject
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => handleSave("stay")}
                  disabled={saving}
                  variant="outline"
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save scores
                </Button>
                <Button
                  onClick={() => handleSave("blueprint")}
                  disabled={saving}
                  className="w-full"
                >
                  {rec.next} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SampleDataDisclaimer />
    </div>
  );
}
