import { createFileRoute, Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  draftUseCase,
  STUDIO_PROVIDERS,
  type StudioProvider,
  type StudioDraft,
} from "@/lib/usecasex.studio.functions";
import { useStudioDrafts, type StudioSavedDraft } from "@/lib/usecasex.studio.store";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Save, Trash2, Wand2, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_app/studio")({
  head: () => ({
    meta: [
      { title: "Use Case Development Studio — UseCasesX™ Pro" },
      {
        name: "description",
        content:
          "Research and draft AI use cases for your organization using OpenAI, ConversX, or Gemini — and save them to your Pro workspace.",
      },
    ],
  }),
  component: StudioPage,
});

const PROVIDER_META: Record<StudioProvider, { label: string; tagline: string }> = {
  openai: { label: "OpenAI", tagline: "GPT family · deep reasoning" },
  gemini: { label: "Gemini", tagline: "Fast, multimodal research" },
  conversx: { label: "ConversX", tagline: "Conversational research engine" },
};

function StudioPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const drafts = useStudioDrafts();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStudioChild = pathname !== "/studio" && pathname !== "/studio/";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/pro", replace: true });
        return;
      }
      setAuthChecked(true);
    })();
  }, [navigate]);

  const draftFn = useServerFn(draftUseCase);
  const [provider, setProvider] = useState<StudioProvider>("gemini");
  const [organization, setOrganization] = useState("");
  const [industry, setIndustry] = useState("");
  const [objective, setObjective] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<{
    draft: StudioDraft;
    model: string;
    provenance?: import("@/lib/ai/types").AiProvenance | null;
  } | null>(null);

  const canSubmit = organization.trim().length > 0 && objective.trim().length > 0 && !loading;

  async function handleGenerate() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setCurrent(null);
    trackCTAEvent("studio_generate_requested", { provider });
    try {
      const res = await draftFn({
        data: { provider, organization, industry, objective, context },
      });
      if (!res.ok || !res.draft) {
        setError(res.error ?? "Failed to draft use case.");
      } else {
        setCurrent({
          draft: res.draft as StudioDraft,
          model: res.meta?.model ?? "",
          provenance: res.provenance,
        });
      }
    } catch (e) {
      console.error(e);
      setError("Unexpected error generating use case.");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!current) return;
    drafts.save({
      organization,
      industry: industry || undefined,
      objective,
      provider,
      model: current.model,
      draft: current.draft,
      provenance: current.provenance ?? undefined,
    });
    trackCTAEvent("studio_draft_saved", { provider });
    setCurrent(null);
  }

  if (!authChecked) {
    if (isStudioChild) return <Outlet />;
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading studio…
      </div>
    );
  }

  if (isStudioChild) return <Outlet />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            UseCasesX™ Pro · Development Studio
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight">
            Research and draft AI use cases for your organization
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Use OpenAI, ConversX, or Gemini to research, structure, and document custom AI use cases
            tailored to your organization — then save them to your Pro workspace.
          </p>
          <div className="mt-6 flex gap-3 text-sm">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              ← Back to dashboard
            </Link>
            <Link to="/my-use-cases" className="text-muted-foreground hover:text-foreground">
              Saved catalog use cases
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" /> Draft a new use case
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block">Research engine</Label>
              <div className="grid grid-cols-3 gap-2">
                {STUDIO_PROVIDERS.map((p) => {
                  const meta = PROVIDER_META[p];
                  const active = provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-sm font-semibold">{meta.label}</div>
                      <div className="text-[11px] text-muted-foreground">{meta.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="org">Organization *</Label>
                <Input
                  id="org"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label htmlFor="ind">Industry</Label>
                <Input
                  id="ind"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Healthcare, Banking, Defense…"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="obj">Objective / question *</Label>
              <Textarea
                id="obj"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Reduce time-to-resolution for tier-1 IT support tickets using agentic AI."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="ctx">Additional context (optional)</Label>
              <Textarea
                id="ctx"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Constraints, existing systems, regulatory environment, data sources, success metrics…"
                rows={4}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button onClick={handleGenerate} disabled={!canSubmit} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate AI Use Case
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Generated draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!current && !loading && (
              <p className="text-sm text-muted-foreground">
                Your generated use case draft will appear here. Save it to add it to your Pro
                workspace.
              </p>
            )}
            {loading && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {PROVIDER_META[provider].label} is
                drafting your use case…
              </div>
            )}
            {current && (
              <DraftView draft={current.draft} model={current.model} onSave={handleSave} />
            )}
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">Your saved studio drafts</h2>
          <span className="text-sm text-muted-foreground">{drafts.items.length} saved</span>
        </div>
        {drafts.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved drafts yet. Generate one above and save it to your workspace.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {drafts.items.map((it) => (
              <SavedDraftCard key={it.id} item={it} onRemove={() => drafts.remove(it.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <SampleDataDisclaimer />
      </section>
    </div>
  );
}

function DraftView({
  draft,
  model,
  onSave,
}: {
  draft: StudioDraft;
  model: string;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{model}</div>
        <h3 className="text-xl font-semibold mt-1">{draft.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{draft.summary}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">AI Type: {draft.aiType}</Badge>
        <Badge variant="secondary">Function: {draft.businessFunction}</Badge>
        <Badge variant="outline">Value: {draft.valuePotential}</Badge>
        <Badge variant="outline">Complexity: {draft.complexity}</Badge>
        <Badge variant="outline">Risk: {draft.riskLevel}</Badge>
        <Badge variant="outline">TTV: {draft.timeToValue}</Badge>
      </div>

      <Section title="Problem" body={draft.problemStatement} />
      <Section title="Proposed solution" body={draft.proposedSolution} />

      <ListBlock title="AI capabilities" items={draft.aiCapabilities} />
      <ListBlock title="Target users" items={draft.targetUsers} />
      <ListBlock title="Data requirements" items={draft.dataRequirements} />
      <ListBlock title="ROI areas" items={draft.roiAreas} />
      <ListBlock title="KPIs" items={draft.kpis} />
      <ListBlock title="Governance considerations" items={draft.governanceConsiderations} />
      <ListBlock title="Next steps" items={draft.nextSteps} />

      <Button onClick={onSave} className="w-full">
        <Save className="h-4 w-4 mr-2" /> Save to my workspace
      </Button>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <p className="text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <ul className="text-sm list-disc pl-5 space-y-1">
        {items.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function SavedDraftCard({ item, onRemove }: { item: StudioSavedDraft; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const provider = PROVIDER_META[item.provider]?.label ?? item.provider;
  const dateLabel = useMemo(() => new Date(item.createdAt).toLocaleString(), [item.createdAt]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{item.draft.title}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              {item.organization}
              {item.industry ? ` · ${item.industry}` : ""} · {provider} · {dateLabel}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">{item.draft.summary}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline">{item.draft.aiType}</Badge>
          <Badge variant="outline">Risk: {item.draft.riskLevel}</Badge>
          <Badge variant="outline">Value: {item.draft.valuePotential}</Badge>
        </div>
        <Button variant="link" className="px-0 mt-2" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide details" : "View details"}
        </Button>
        {open && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <Section title="Problem" body={item.draft.problemStatement} />
            <Section title="Proposed solution" body={item.draft.proposedSolution} />
            <ListBlock title="KPIs" items={item.draft.kpis} />
            <ListBlock title="Next steps" items={item.draft.nextSteps} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
