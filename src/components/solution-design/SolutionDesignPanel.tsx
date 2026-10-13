import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { AgentCardPreviewView } from "@/components/solution-design/AgentCardPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AUTONOMY_LABEL,
  AUTONOMY_LEVELS,
  BUILD_BUY_LABEL,
  BUILD_BUY_PARTNER,
  buildAgentCardPreview,
  emptySolutionDesign,
  isAgenticSolutionType,
  markField,
  OWASP_GENAI_PROMPTS,
  OWASP_PROMPT_PACK_VERSION,
  SOLUTION_TYPE_LABEL,
  SOLUTION_TYPES,
  type AutonomyLevel,
  type BuildBuyPartner,
  type SolutionDesignDraft,
  type SolutionType,
} from "@/lib/solution-design/model";
import {
  getSolutionDesignFn,
  saveSolutionDesignFn,
} from "@/lib/solution-design/solution-design.functions";

function FieldStatusActions({
  fieldKey,
  draft,
  onChange,
}: {
  fieldKey: string;
  draft: SolutionDesignDraft;
  onChange: (next: SolutionDesignDraft) => void;
}) {
  const status = draft.fieldMeta[fieldKey]?.status ?? "confirmed";
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        size="sm"
        variant={status === "confirmed" ? "secondary" : "ghost"}
        className="h-7 text-xs"
        onClick={() =>
          onChange({ ...draft, fieldMeta: markField(draft.fieldMeta, fieldKey, "confirmed") })
        }
      >
        Confirm
      </Button>
      <Button
        type="button"
        size="sm"
        variant={status === "ai_draft" ? "secondary" : "ghost"}
        className="h-7 text-xs"
        onClick={() =>
          onChange({
            ...draft,
            fieldMeta: markField(draft.fieldMeta, fieldKey, "ai_draft", {
              source: "assistant",
            }),
          })
        }
      >
        Mark AI draft
      </Button>
    </div>
  );
}

export function SolutionDesignPanel({
  useCaseId,
  useCaseTitle,
}: {
  useCaseId: string;
  useCaseTitle?: string;
}) {
  const load = useServerFn(getSolutionDesignFn);
  const save = useServerFn(saveSolutionDesignFn);

  const [draft, setDraft] = useState<SolutionDesignDraft>(() => emptySolutionDesign());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toolInput, setToolInput] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const row = await load({ data: { useCaseId } });
        if (active && row) {
          setDraft(emptySolutionDesign(row));
        }
      } catch {
        /* empty draft */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [load, useCaseId]);

  const agentic = isAgenticSolutionType(draft.solutionType);
  const card = useMemo(
    () => buildAgentCardPreview(draft, { title: useCaseTitle ?? "AI System / Agent Card" }),
    [draft, useCaseTitle],
  );

  async function persist() {
    setSaving(true);
    try {
      const saved = await save({ data: { useCaseId, draft } });
      setDraft(emptySolutionDesign(saved));
      toast.success("Solution design saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save solution design.");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof SolutionDesignDraft>(key: K, value: SolutionDesignDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (
        typeof value === "string" &&
        value.trim() &&
        key !== "fieldMeta" &&
        key !== "owaspResponses"
      ) {
        const metaKey = key as string;
        if (!prev.fieldMeta[metaKey] || prev.fieldMeta[metaKey]?.status === "missing") {
          next.fieldMeta = markField(prev.fieldMeta, metaKey, "confirmed");
        }
      }
      return next;
    });
  }

  function addTool() {
    const v = toolInput.trim();
    if (!v) return;
    set("toolsActions", [...draft.toolsActions, v].slice(0, 40));
    setToolInput("");
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading solution design…
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solution classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sd-type">Solution type</Label>
              <Select
                value={draft.solutionType ?? "undecided"}
                onValueChange={(v) => set("solutionType", v as SolutionType)}
              >
                <SelectTrigger id="sd-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLUTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SOLUTION_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sd-modality">Modality / capability notes</Label>
              <Textarea
                id="sd-modality"
                rows={2}
                value={draft.modalityNotes}
                onChange={(e) => set("modalityNotes", e.target.value)}
                placeholder="How the AI capability is expected to operate"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sd-build">Build / buy / partner</Label>
                <Select
                  value={draft.buildBuyPartner ?? "undecided"}
                  onValueChange={(v) => set("buildBuyPartner", v as BuildBuyPartner)}
                >
                  <SelectTrigger id="sd-build">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILD_BUY_PARTNER.map((t) => (
                      <SelectItem key={t} value={t}>
                        {BUILD_BUY_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sd-autonomy">Autonomy level</Label>
                <Select
                  value={draft.autonomyLevel ?? "undecided"}
                  onValueChange={(v) => set("autonomyLevel", v as AutonomyLevel)}
                >
                  <SelectTrigger id="sd-autonomy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTONOMY_LEVELS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {AUTONOMY_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sd-human">Human role and decision authority</Label>
              <Textarea
                id="sd-human"
                rows={2}
                value={draft.humanRole}
                onChange={(e) => set("humanRole", e.target.value)}
                placeholder="Who decides, reviews or overrides the system"
              />
              <FieldStatusActions fieldKey="humanRole" draft={draft} onChange={setDraft} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model, tools and vendors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["modelOptions", "Model options", "Candidate models or model families"],
                ["toolOptions", "Tool options", "APIs, RPA, search, code exec, etc."],
                ["vendorOptions", "Vendor options", "Platforms or suppliers under consideration"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`sd-${key}`}>{label}</Label>
                <Textarea
                  id={`sd-${key}`}
                  rows={2}
                  value={draft[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                />
                <FieldStatusActions fieldKey={key} draft={draft} onChange={setDraft} />
              </div>
            ))}
          </CardContent>
        </Card>

        {agentic ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agentic workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Action limits, human checkpoints and kill switch must be confirmed before Pilot
                Authorization for agentic patterns.
              </p>
              {(
                [
                  ["agentGoal", "Agent goal", "What the agent is optimising for"],
                  ["planningMethod", "Planning method", "ReAct, plan-then-act, DAG, etc."],
                  [
                    "identitiesCredentials",
                    "Identities / credentials",
                    "Service identities, secrets custody, rotation",
                  ],
                  ["memory", "Memory", "Short-term, long-term, none"],
                  ["knowledgeSources", "Knowledge sources", "RAG corpora, APIs, files"],
                  ["delegation", "Delegation", "What may be delegated to sub-agents or tools"],
                  [
                    "humanCheckpoints",
                    "Human checkpoints *",
                    "Where a human must approve or can interrupt",
                  ],
                  [
                    "actionLimits",
                    "Action limits *",
                    "Allowed / prohibited actions and rate bounds",
                  ],
                  ["transactionLimits", "Transaction limits", "Monetary, volume or scope caps"],
                  ["sandbox", "Sandbox", "Isolation, dry-run, environment boundaries"],
                  ["killSwitch", "Kill switch *", "How the agent is stopped and by whom"],
                  ["observability", "Observability", "Logs, traces, eval hooks"],
                  ["fallback", "Fallback", "Safe degradation when the agent fails"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`sd-${key}`}>{label}</Label>
                  <Textarea
                    id={`sd-${key}`}
                    rows={2}
                    value={draft[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                  />
                  <FieldStatusActions fieldKey={key} draft={draft} onChange={setDraft} />
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="sd-tools-actions">Tools / actions</Label>
                <div className="flex gap-2">
                  <Input
                    id="sd-tools-actions"
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTool();
                      }
                    }}
                    placeholder="Add a tool or action and press Enter"
                  />
                  <Button type="button" variant="secondary" onClick={addTool}>
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add</span>
                  </Button>
                </div>
                {draft.toolsActions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {draft.toolsActions.map((t, i) => (
                      <Badge key={`${t}-${i}`} variant="secondary" className="gap-1">
                        {t}
                        <button
                          type="button"
                          aria-label={`Remove ${t}`}
                          onClick={() =>
                            set(
                              "toolsActions",
                              draft.toolsActions.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <FieldStatusActions fieldKey="toolsActions" draft={draft} onChange={setDraft} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Select <strong>Agentic workflow</strong>, <strong>Hybrid</strong> or{" "}
            <strong>Robotics</strong> to open the agentic design section.
          </p>
        )}

        <Accordion type="multiple" className="rounded-lg border border-border px-4">
          <AccordionItem value="owasp">
            <AccordionTrigger>
              OWASP GenAI risk prompts ({OWASP_PROMPT_PACK_VERSION})
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <p className="text-xs text-muted-foreground">
                Configurable readiness prompts — not legal conclusions. Completing them does not
                make a use case “safe”, “compliant” or “approved”.
              </p>
              {OWASP_GENAI_PROMPTS.map((p) => {
                const entry = draft.owaspResponses[p.id] ?? {
                  response: "",
                  status: "missing" as const,
                };
                return (
                  <div key={p.id} className="space-y-2 rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{p.theme}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.prompt}</p>
                    <p className="text-[10px] text-muted-foreground">{p.disclaimer}</p>
                    <Textarea
                      rows={2}
                      value={entry.response}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          owaspResponses: {
                            ...prev.owaspResponses,
                            [p.id]: {
                              response: e.target.value,
                              status: e.target.value.trim() ? "confirmed" : "missing",
                            },
                          },
                        }))
                      }
                      placeholder="Workspace response (optional)"
                    />
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button onClick={() => void persist()} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save solution design
        </Button>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <AgentCardPreviewView card={card} />
      </aside>
    </div>
  );
}
