import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { PageHero } from "@/components/usecasex/PageHero";
import type { UseCaseContent } from "@/lib/domain/saved-use-cases.repository";
import {
  computeTotalScore,
  interpretScore,
  defaultScore,
  SCORE_LABELS,
  type Priority,
  type ScoreDimensions,
} from "@/lib/usecasex.store";
import { useUseCaseXPro } from "@/hooks/usecasex-pro";
import { trackCTAEvent } from "@/lib/usecasex.tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2, FileText, Target, Gauge, FolderPlus } from "lucide-react";
import { Can } from "@/components/Can";
import { MyContributions } from "@/components/usecasex/MyContributions";
import { useState } from "react";

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Strategic"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Route = createFileRoute("/_app/my-use-cases")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Saved Use Cases — UseCasesX™ Pro" },
      {
        name: "description",
        content:
          "Your shortlisted AI use cases with notes, priorities, scoring and portfolio assignment.",
      },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const store = useUseCaseXPro();

  useEffect(() => {
    if (session === null) navigate({ to: "/pro", replace: true });
  }, [session, navigate]);

  const items = useMemo(() => {
    return store.saved
      .map((entry) => {
        const uc = store.useCaseContent[entry.useCaseSlug];
        return uc ? { entry, uc } : null;
      })
      .filter(Boolean) as {
      entry: ReturnType<typeof useUseCaseXPro>["saved"][number];
      uc: UseCaseContent;
    }[];
  }, [store.saved, store.useCaseContent]);

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
        Loading your saved use cases…
      </div>
    );
  }

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="My Use Cases"
        title="Saved Use Cases"
        description="Score, prioritize, and assemble portfolios from your shortlisted AI opportunities."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/repository">Explore more</Link>
            </Button>
            <Button asChild>
              <Link to="/portfoliox">Portfolios</Link>
            </Button>
          </>
        }
      />
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-[1280px] px-6 py-12 space-y-8">
          <MyContributions />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">
              Saved use cases
            </h2>
            <p className="text-xs text-muted-foreground">
              Repository use cases you shortlisted, with your notes, priorities and scores.
            </p>
          </div>
          {items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <p className="text-lg font-medium">No saved use cases yet</p>
                <p className="text-sm text-muted-foreground">
                  Browse the catalogue and save opportunities to begin building your portfolio.
                </p>
                <Button asChild className="mt-2">
                  <Link to="/repository">Explore use cases</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map(({ entry, uc }) => (
                <SavedCard
                  key={uc.slug}
                  uc={uc}
                  note={entry.note ?? ""}
                  priority={entry.priority}
                  score={entry.score}
                  store={store}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function SavedCard({
  uc,
  note,
  priority,
  score,
  store,
}: {
  uc: UseCaseContent;
  note: string;
  priority: Priority;
  score?: ScoreDimensions;
  store: ReturnType<typeof useUseCaseXPro>;
}) {
  const total = computeTotalScore(score);
  const interp = interpretScore(total);
  // Preserve active tag context (Industry = primary, Department = business
  // function) when navigating from a saved card to the detail view.
  const detailSearch = {
    dept: uc.industry?.slug ?? "",
    func: slugify(uc.businessFunction ?? ""),
  } as any;

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">
            <Link
              to="/use-cases/$slug"
              params={{ slug: uc.slug }}
              search={detailSearch}
              className="hover:underline"
            >
              {uc.title}
            </Link>
          </CardTitle>
          <PriorityBadge priority={priority} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-3">{uc.summary}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="secondary" className="text-[10px]" title="Industry">
            {uc.industry?.name ?? "—"}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] border-violet-500/40 text-violet-600 dark:text-violet-400"
            title="Department"
          >
            {uc.businessFunction ?? "—"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {uc.aiCapability ?? "—"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">AIgilityX Score</span>
            <span className="text-2xl font-semibold tabular-nums">{score ? total : "—"}</span>
          </div>
          {score && <p className={`text-[11px] mt-1 ${interp.toneClass}`}>{interp.label}</p>}
        </div>

        {note && (
          <div className="text-xs text-muted-foreground bg-accent/30 rounded-md p-2 border">
            <span className="font-medium text-foreground">Note: </span>
            {note}
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-2 mt-auto">
          <PriorityPicker priority={priority} onChange={(p) => store.setPriority(uc.slug, p)} />
          <Can action="saved.edit" fallback={<LockedAction label="Notes" />}>
            <NoteDialog slug={uc.slug} initial={note} onSave={(n) => store.setNote(uc.slug, n)} />
          </Can>
          <Can action="saved.edit" fallback={<LockedAction label="Score" />}>
            <ScoreDialog
              slug={uc.slug}
              initial={score}
              onSave={(s) => store.setScore(uc.slug, s)}
            />
          </Can>
          <AddToPortfolioDialog slug={uc.slug} store={store} />
        </div>

        <Can action="saved.delete">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive justify-start"
            onClick={() => {
              store.removeSaved(uc.slug);
              trackCTAEvent("saved_use_case_removed", { slug: uc.slug });
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Remove
          </Button>
        </Can>
      </CardContent>
    </Card>
  );
}

function LockedAction({ label }: { label: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled
      className="text-xs h-9 opacity-60"
      title="Editor or admin role required"
    >
      {label}
    </Button>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const tone =
    priority === "Strategic"
      ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
      : priority === "High"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        : priority === "Medium"
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
          : "bg-muted text-muted-foreground border-border";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tone}`}>{priority}</span>;
}

function PriorityPicker({
  priority,
  onChange,
}: {
  priority: Priority;
  onChange: (p: Priority) => void;
}) {
  return (
    <Select value={priority} onValueChange={(v) => onChange(v as Priority)}>
      <SelectTrigger className="h-9 text-xs">
        <Target className="w-3.5 h-3.5 mr-1" />
        <SelectValue placeholder="Priority" />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p} className="text-xs">
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NoteDialog({
  slug,
  initial,
  onSave,
}: {
  slug: string;
  initial: string;
  onSave: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-9">
          <FileText className="w-3.5 h-3.5 mr-1" /> Notes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
        </DialogHeader>
        <Textarea
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add internal notes, context, owners or open questions…"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(value);
              trackCTAEvent("saved_use_case_note", { slug });
              setOpen(false);
            }}
          >
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScoreDialog({
  slug,
  initial,
  onSave,
}: {
  slug: string;
  initial?: ScoreDimensions;
  onSave: (s: ScoreDimensions) => void;
}) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<ScoreDimensions>(initial ?? defaultScore());
  useEffect(() => {
    if (open) setS(initial ?? defaultScore());
  }, [open, initial]);

  const total = computeTotalScore(s);
  const interp = interpretScore(total);

  const setDim = (k: keyof ScoreDimensions, v: number) => setS((prev) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-9">
          <Gauge className="w-3.5 h-3.5 mr-1" /> Score
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Score this use case</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total AIgilityX Score
            </p>
            <p className={`text-sm mt-1 ${interp.toneClass}`}>{interp.label}</p>
          </div>
          <div className="text-5xl font-semibold tabular-nums">{total}</div>
        </div>

        <div className="space-y-5 pt-2">
          {(Object.keys(SCORE_LABELS) as Array<keyof ScoreDimensions>).map((k) => (
            <div key={k}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">{SCORE_LABELS[k]}</span>
                <span className="tabular-nums text-muted-foreground">{s[k]}</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[s[k]]}
                onValueChange={(v) => setDim(k, v[0] ?? 0)}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(s);
              trackCTAEvent("use_case_scored", { slug, total });
              setOpen(false);
            }}
          >
            Save score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddToPortfolioDialog({
  slug,
  store,
}: {
  slug: string;
  store: ReturnType<typeof useUseCaseXPro>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-9">
          <FolderPlus className="w-3.5 h-3.5 mr-1" /> Portfolio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to portfolio</DialogTitle>
        </DialogHeader>
        {store.portfolios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No portfolios yet.{" "}
            <Link to="/portfoliox" className="underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a portfolio" />
            </SelectTrigger>
            <SelectContent>
              {store.portfolios.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} <span className="text-muted-foreground">— {p.type}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              store.addToPortfolio(selected, slug);
              trackCTAEvent("use_case_added_to_portfolio", { slug, portfolioId: selected });
              setOpen(false);
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
