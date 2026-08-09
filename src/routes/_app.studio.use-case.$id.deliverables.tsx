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
import { Separator } from "@/components/ui/separator";
import { DELIVERABLE_META, type DeliverableType, type DeliverableStatus } from "@/lib/deliverables";
import { saveDeliverable } from "@/lib/deliverables.data";
import {
  composeAll,
  loadUseCaseSources,
  type ComposedDeliverable,
} from "@/lib/deliverables.compose";
import { exportPackagePDF, exportPackageWord, type ExportPackage } from "@/lib/deliverables.export";
import { FairUseMeter } from "@/components/ai/FairUseMeter";
import { useFairUse } from "@/hooks/useFairUse";
import {
  ArrowRight,
  Download,
  ExternalLink,
  FileStack,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_app/studio/use-case/$id/deliverables")({
  head: () => ({
    meta: [
      { title: "Deliverables — AI Use Case Studio" },
      {
        name: "description",
        content:
          "View, generate and export the 12 enterprise AI advisory deliverables for a use case as one report package.",
      },
      { property: "og:title", content: "Enterprise Deliverables — AI Use Case Studio" },
      {
        property: "og:description",
        content: "Generate and export all 12 advisory deliverables from one place.",
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

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "use-case"
  );
}

function DeliverablesHub() {
  const { id } = Route.useParams();
  const [title, setTitle] = useState<string | null>(null);
  const [items, setItems] = useState<ComposedDeliverable[]>([]);
  const [selected, setSelected] = useState<Set<DeliverableType>>(new Set());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<null | "generate" | "pdf" | "word">(null);
  const fairUse = useFairUse();

  const refresh = useCallback(async () => {
    const [uc, sources] = await Promise.all([
      studioRepo.getStudioUseCase<{ title: string }>(id, "title").catch(() => null),
      loadUseCaseSources(id),
    ]);
    setTitle(uc?.title ?? null);
    const composed = composeAll(sources);
    setItems(composed);
    setSelected((prev) => {
      if (prev.size) return prev;
      return new Set(composed.filter((c) => c.hasContent).map((c) => c.type));
    });
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
  const withContent = items.filter((i) => i.hasContent);
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
  const clearAll = () => setSelected(new Set());

  const buildPackage = (): ExportPackage => ({
    title: `${title ?? "Use case"} — Enterprise Deliverables`,
    subtitle: `${selectedItems.length} deliverable${selectedItems.length === 1 ? "" : "s"} · UseCasesX™`,
    documents: selectedItems.map((item) => ({
      title: item.label,
      subtitle: item.description,
      sections: item.sections,
    })),
  });

  const onExport = async (kind: "pdf" | "word") => {
    if (!selectedItems.length) {
      toast.error("Select at least one deliverable with content to export.");
      return;
    }
    setWorking(kind);
    try {
      const base = `${slugify(title ?? "use-case")}-deliverables`;
      if (kind === "pdf") exportPackagePDF(buildPackage(), `${base}.pdf`);
      else await exportPackageWord(buildPackage(), `${base}.docx`);
      toast.success("Deliverable package exported.");
    } catch {
      toast.error("The export did not complete. Try again.");
    } finally {
      setWorking(null);
    }
  };

  const onGenerate = async () => {
    const targets = items.filter((i) => selected.has(i.type) && i.origin === "derived");
    if (!targets.length) {
      toast.info("Nothing new to generate — the selected deliverables are already stored.");
      return;
    }
    if (fairUse.blocked) {
      toast.error("You have reached your fair-use limit for now. Existing work stays available.");
      return;
    }
    setWorking("generate");
    try {
      for (const item of targets) {
        await saveDeliverable(
          id,
          item.type,
          { generated: true, generatedAt: new Date().toISOString(), sections: item.sections },
          "draft",
        );
      }
      await refresh();
      await fairUse.refresh();
      toast.success(
        `Stored ${targets.length} generated deliverable${targets.length === 1 ? "" : "s"}.`,
      );
    } catch {
      toast.error("We could not store the generated deliverables. Try again.");
    } finally {
      setWorking(null);
    }
  };

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
            composed from what you have captured and exported as one client-ready package.
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
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedItems.length} selected for export</span>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select all with content
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => {
                  const meta = DELIVERABLE_META[item.type];
                  const checked = selected.has(item.type);
                  return (
                    <Card key={item.type} className="flex flex-col">
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
                          </p>
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
                          {item.moduleRoute && (
                            <Button size="sm" variant="ghost" asChild>
                              <Link
                                to={item.moduleRoute as never}
                                params={
                                  (item.moduleRoute.includes("$id") ? { id } : undefined) as never
                                }
                              >
                                Source module <ExternalLink className="ml-1 h-3 w-3" />
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
              <Button
                className="w-full"
                disabled={!selectedItems.length || working !== null}
                onClick={() => onExport("pdf")}
              >
                {working === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export PDF package
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={!selectedItems.length || working !== null}
                onClick={() => onExport("word")}
              >
                {working === "word" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Export Word package
              </Button>
              <Separator />
              <Button
                variant="secondary"
                className="w-full"
                disabled={working !== null || fairUse.blocked}
                onClick={onGenerate}
              >
                {working === "generate" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate &amp; store selected
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

      <SampleDataDisclaimer />
    </div>
  );
}
