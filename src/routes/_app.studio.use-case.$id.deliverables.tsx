import { createFileRoute, Link } from "@tanstack/react-router";
import { RequirePlan } from "@/components/RequirePlan";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as studioRepo from "@/lib/domain/studio.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DELIVERABLE_META, type DeliverableType, type DeliverableStatus } from "@/lib/deliverables";
import { saveDeliverable, loadVersionCounts } from "@/lib/deliverables.data";
import {
  composeAll,
  composeDeliverable,
  loadUseCaseSources,
  type ComposedDeliverable,
  type UseCaseSources,
} from "@/lib/deliverables.compose";
import { exportPackagePDF, exportPackageWord, type ExportPackage } from "@/lib/deliverables.export";
import { FairUseMeter } from "@/components/ai/FairUseMeter";
import { DeliverableHistoryDialog } from "@/components/studio/DeliverableHistoryDialog";
import { useFairUse } from "@/hooks/useFairUse";
import {
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileStack,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

export const Route = createFileRoute("/_app/studio/use-case/$id/deliverables")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Deliverables — AI Use Case Studio" },
      {
        name: "description",
        content:
          "View, generate, version and export the 12 enterprise AI advisory deliverables for a use case as one report package.",
      },
      { property: "og:title", content: "Enterprise Deliverables — AI Use Case Studio" },
      {
        property: "og:description",
        content: "Generate, track versions and export all 12 advisory deliverables from one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequirePlan min="pro" feature="Enterprise Deliverables">
      <DeliverablesHub />
    </RequirePlan>
  ),
});

const STATUS_STYLE: Record<DeliverableStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  not_started: "Not started",
  draft: "Draft",
  ready: "Ready",
};

const ORIGIN_LABEL: Record<ComposedDeliverable["origin"], string> = {
  saved: "Authored",
  derived: "Generated from your data",
  empty: "No content yet",
};

/** Live per-deliverable state while a generation or a package build runs. */
type WorkState = "queued" | "generating" | "composing" | "done" | "error";

const WORK_LABEL: Record<WorkState, string> = {
  queued: "Queued",
  generating: "Regenerating…",
  composing: "Adding to package…",
  done: "Complete",
  error: "Failed",
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "use-case"
  );
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 120));

function DeliverablesHub() {
  const { id } = Route.useParams();
  const [title, setTitle] = useState<string | null>(null);
  const [sources, setSources] = useState<UseCaseSources | null>(null);
  const [items, setItems] = useState<ComposedDeliverable[]>([]);
  const [versionCounts, setVersionCounts] = useState<
    Record<string, { count: number; latestAt: string }>
  >({});
  const [selected, setSelected] = useState<Set<DeliverableType>>(new Set());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | "generate" | "pdf" | "word" | "oneclick">(null);
  const [work, setWork] = useState<Record<string, WorkState>>({});
  const [historyType, setHistoryType] = useState<DeliverableType | null>(null);
  const fairUse = useFairUse();

  const refresh = useCallback(async () => {
    const [uc, src, counts] = await Promise.all([
      studioRepo.getStudioUseCase<{ title: string }>(id, "title").catch(() => null),
      loadUseCaseSources(id),
      loadVersionCounts(id).catch(() => ({})),
    ]);
    setTitle(uc?.title ?? null);
    setSources(src);
    setVersionCounts(counts);
    const composed = composeAll(src);
    setItems(composed);
    setSelected((prev) => {
      if (prev.size) return prev;
      return new Set(composed.filter((c) => c.hasContent).map((c) => c.type));
    });
    return composed;
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch {
        toast.error("We could not load these deliverables. Try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const readyCount = items.filter((i) => i.status === "ready").length;
  const withContent = useMemo(() => items.filter((i) => i.hasContent), [items]);
  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.type) && i.hasContent),
    [items, selected],
  );

  const toggle = (type: DeliverableType) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const selectAll = () => setSelected(new Set(withContent.map((i) => i.type)));
  const selectReady = () =>
    setSelected(new Set(items.filter((i) => i.status === "ready").map((i) => i.type)));
  const clearAll = () => setSelected(new Set());
  const allSelected = withContent.length > 0 && selectedItems.length === withContent.length;

  const setItemWork = (type: DeliverableType, state: WorkState | null) =>
    setWork((prev) => {
      const next = { ...prev };
      if (state === null) delete next[type];
      else next[type] = state;
      return next;
    });

  const buildPackage = (chosen: ComposedDeliverable[]): ExportPackage => ({
    title: `${title ?? "Use case"} — Enterprise Deliverables`,
    subtitle: `${chosen.length} deliverable${chosen.length === 1 ? "" : "s"} · UseCasesX™`,
    documents: chosen.map((item) => ({
      title: item.label,
      subtitle: item.description,
      sections: item.sections,
    })),
  });

  /** Regenerate one deliverable from the latest module data and store a version. */
  const regenerateOne = async (type: DeliverableType, silent = false) => {
    if (fairUse.blocked) {
      toast.error("You have reached your fair-use limit for now. Existing work stays available.");
      return false;
    }
    setItemWork(type, "generating");
    try {
      const src = await loadUseCaseSources(id);
      const composedItem = composeDeliverable(type, { ...src, saved: {} });
      if (!composedItem.hasContent) {
        setItemWork(type, "error");
        if (!silent)
          toast.error(
            `${DELIVERABLE_META[type].label} has no source data yet — complete the module first.`,
          );
        return false;
      }
      await saveDeliverable(
        id,
        type,
        {
          generated: true,
          generatedAt: new Date().toISOString(),
          sections: composedItem.sections,
        },
        "draft",
        { origin: "generated", summary: "Regenerated from module data" },
      );
      setItemWork(type, "done");
      if (!silent) toast.success(`${DELIVERABLE_META[type].label} regenerated.`);
      return true;
    } catch {
      setItemWork(type, "error");
      if (!silent) toast.error("We could not regenerate that deliverable. Try again.");
      return false;
    }
  };

  const runGeneration = async (targets: ComposedDeliverable[]) => {
    targets.forEach((t) => setItemWork(t.type, "queued"));
    let ok = 0;
    for (const target of targets) {
      const success = await regenerateOne(target.type, true);
      if (success) ok += 1;
    }
    await refresh();
    await fairUse.refresh();
    return ok;
  };

  const onGenerateSelected = async () => {
    const targets = items.filter((i) => selected.has(i.type) && i.origin !== "saved");
    if (!targets.length) {
      toast.info("Nothing new to generate — the selected deliverables are already stored.");
      return;
    }
    if (fairUse.blocked) {
      toast.error("You have reached your fair-use limit for now. Existing work stays available.");
      return;
    }
    setRunning("generate");
    try {
      const ok = await runGeneration(targets);
      toast.success(`Stored ${ok} generated deliverable${ok === 1 ? "" : "s"}.`);
    } finally {
      setRunning(null);
      setTimeout(() => setWork({}), 1500);
    }
  };

  const onRegenerateOne = async (type: DeliverableType) => {
    const done = await regenerateOne(type);
    if (done) await refresh();
    setTimeout(() => setItemWork(type, null), 1500);
  };

  const runExport = async (kind: "pdf" | "word", chosen: ComposedDeliverable[]) => {
    // Walk the chapters so each card reports its own state while the package builds.
    for (const item of chosen) {
      setItemWork(item.type, "composing");
      await tick();
      setItemWork(item.type, "done");
    }
    const base = `${slugify(title ?? "use-case")}-deliverables`;
    const pkg = buildPackage(chosen);
    if (kind === "pdf") exportPackagePDF(pkg, `${base}.pdf`);
    else await exportPackageWord(pkg, `${base}.docx`);
  };

  const onExport = async (kind: "pdf" | "word") => {
    if (!selectedItems.length) {
      toast.error("Select at least one deliverable with content to export.");
      return;
    }
    setRunning(kind);
    try {
      await runExport(kind, selectedItems);
      toast.success("Deliverable package exported.");
    } catch {
      toast.error("The export did not complete. Try again.");
    } finally {
      setRunning(null);
      setTimeout(() => setWork({}), 1500);
    }
  };

  /** One click: refresh anything derived, then export every selection as one package. */
  const onGenerateAndExport = async () => {
    if (!selectedItems.length) {
      toast.error("Select at least one deliverable with content first.");
      return;
    }
    setRunning("oneclick");
    try {
      const stale = items.filter((i) => selected.has(i.type) && i.origin === "derived");
      if (stale.length && !fairUse.blocked) await runGeneration(stale);
      const latest = await refresh();
      const chosen = latest.filter((i) => selected.has(i.type) && i.hasContent);
      await runExport("pdf", chosen);
      toast.success(`Package built with ${chosen.length} deliverables.`);
    } catch {
      toast.error("We could not build the package. Try again.");
    } finally {
      setRunning(null);
      setTimeout(() => setWork({}), 1500);
    }
  };

  const activeCount = Object.values(work).filter(
    (s) => s === "queued" || s === "generating" || s === "composing",
  ).length;
  const totalTracked = Object.keys(work).length;
  const progressPct = totalTracked
    ? Math.round(((totalTracked - activeCount) / totalTracked) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            AI Use Case Studio
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Enterprise Deliverables</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            The 12 advisory deliverables for{" "}
            <span className="font-medium text-foreground">{title ?? "this use case"}</span>. Each is
            composed from what you have captured, versioned on every save, and exported as one
            client-ready package.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">
              <FileStack className="mr-1 h-3 w-3" /> {readyCount} / 12 ready
            </Badge>
            <Badge variant="outline">{withContent.length} with content</Badge>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to="/studio/use-case/$id" params={{ id }}>
            ← Use Case
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => (allSelected ? clearAll() : selectAll())}
                  aria-label="Select every deliverable that has content"
                  id="select-all-deliverables"
                />
                <label
                  htmlFor="select-all-deliverables"
                  className="cursor-pointer text-sm font-medium"
                >
                  {selectedItems.length} of {withContent.length} selected
                </label>
                <span className="flex-1" />
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  All with content
                </Button>
                <Button variant="ghost" size="sm" onClick={selectReady}>
                  Ready only
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => {
                  const meta = DELIVERABLE_META[item.type];
                  const checked = selected.has(item.type);
                  const state = work[item.type];
                  const history = versionCounts[item.type];
                  return (
                    <Card
                      key={item.type}
                      className={
                        state === "error"
                          ? "flex flex-col border-destructive/50"
                          : state && state !== "done"
                            ? "flex flex-col border-primary/50"
                            : "flex flex-col"
                      }
                    >
                      <CardHeader className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="flex items-start gap-2 text-sm leading-snug">
                            <Checkbox
                              checked={checked}
                              disabled={!item.hasContent}
                              onCheckedChange={() => toggle(item.type)}
                              aria-label={`Include ${meta.label} in the export package`}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="text-muted-foreground">{meta.order}. </span>
                              {meta.label}
                            </span>
                          </CardTitle>
                          <Badge variant="secondary" className={STATUS_STYLE[item.status]}>
                            {STATUS_LABEL[item.status]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{meta.description}</p>
                          <p className="text-[11px] text-muted-foreground/80">
                            {ORIGIN_LABEL[item.origin]}
                            {item.hasContent ? ` · ${item.sections.length} sections` : ""}
                            {history ? ` · v${history.count}` : ""}
                          </p>
                          {state && (
                            <p
                              role="status"
                              aria-live="polite"
                              className={
                                state === "error"
                                  ? "flex items-center gap-1.5 text-[11px] text-destructive"
                                  : "flex items-center gap-1.5 text-[11px] text-primary"
                              }
                            >
                              {state === "done" ? (
                                <Check className="h-3 w-3" aria-hidden />
                              ) : state === "error" ? (
                                <TriangleAlert className="h-3 w-3" aria-hidden />
                              ) : (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              )}
                              {WORK_LABEL[state]}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              to="/studio/use-case/$id/deliverable/$type"
                              params={{ id, type: item.type }}
                            >
                              {item.origin === "empty" ? "Build" : "Open"}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={running !== null || !!state || fairUse.blocked}
                            onClick={() => onRegenerateOne(item.type)}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Regenerate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!history}
                            onClick={() => setHistoryType(item.type)}
                          >
                            <History className="mr-1 h-3 w-3" />
                            History{history ? ` (${history.count})` : ""}
                          </Button>
                          {item.moduleRoute && (
                            <Button size="sm" variant="ghost" asChild>
                              <Link
                                to={item.moduleRoute as never}
                                params={
                                  (item.moduleRoute.includes("$id") ? { id } : undefined) as never
                                }
                              >
                                Source <ExternalLink className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Export package</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                One document with a cover page, contents list and every selected deliverable as a
                chapter.
              </p>

              {totalTracked > 0 && (
                <div className="space-y-1">
                  <Progress value={progressPct} aria-label="Package build progress" />
                  <p className="text-[11px] text-muted-foreground" role="status" aria-live="polite">
                    {activeCount > 0
                      ? `${totalTracked - activeCount} of ${totalTracked} deliverables processed`
                      : `All ${totalTracked} deliverables processed`}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!selectedItems.length || running !== null}
                onClick={onGenerateAndExport}
              >
                {running === "oneclick" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate &amp; export package
              </Button>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                disabled={!selectedItems.length || running !== null}
                onClick={() => onExport("pdf")}
              >
                {running === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export PDF package
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={!selectedItems.length || running !== null}
                onClick={() => onExport("word")}
              >
                {running === "word" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Export Word package
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={running !== null || fairUse.blocked}
                onClick={onGenerateSelected}
              >
                {running === "generate" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate selected
              </Button>
              {fairUse.blocked && (
                <p className="text-xs text-destructive">
                  Generation is paused until your fair-use allowance resets. Export still works.
                </p>
              )}
            </CardContent>
          </Card>

          <FairUseMeter status={fairUse.status} loading={fairUse.loading} />
        </aside>
      </div>

      <DeliverableHistoryDialog
        open={historyType !== null}
        onOpenChange={(open) => !open && setHistoryType(null)}
        useCaseId={id}
        type={historyType}
        onReverted={async () => {
          await refresh();
        }}
      />

      <SampleDataDisclaimer />
    </div>
  );
}
