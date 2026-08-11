/**
 * Sovereign Public Value Canvas™ — the public-sector companion to the workshop
 * board. Facilitators complete seven sections and record, per section, whether
 * the answer is evidenced or still an assumption; participants and observers
 * read it. Everything shown is loaded from what has actually been written.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSignature, FileText, Landmark, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CANVAS_CONFIDENCE,
  CANVAS_CONFIDENCE_LABEL,
  CANVAS_META,
  CANVAS_SECTION_LABEL,
  MIN_ANSWER_LENGTH,
  assessCanvas,
  emptyCanvasSections,
  isSectionAnswered,
  type CanvasConfidence,
  type CanvasSection,
  type CanvasSections,
} from "@/lib/workshops.public-value";
import {
  getPublicValueCanvasFn,
  recordPublicValueCanvasVersionFn,
  savePublicValueCanvasFn,
} from "@/lib/workshops.functions";
import {
  REPORT_LANGUAGE_LABEL,
  REPORT_LANGUAGES,
  type ReportLanguage,
} from "@/lib/i18n/report-language";
import {
  buildCanvasPdfBlocks,
  buildCanvasSummaryLines,
  localizedCanvasToCsv,
  localizedCanvasToMarkdown,
} from "@/lib/workshops.public-value.export";
import { CanvasDocumentPanel, useCanvasDocuments } from "./CanvasDocumentPanel";
import { CanvasVersionHistory } from "./CanvasVersionHistory";

function download(filename: string, mime: string, text: string) {
  const blob = new Blob([`\uFEFF${text}`], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SovereignPublicValueCanvas({
  workshopId,
  workshopTitle,
  organisation,
  canEdit,
}: {
  workshopId: string;
  workshopTitle: string;
  organisation?: string;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const canvas = useQuery({
    queryKey: ["workshop-public-value-canvas", workshopId],
    queryFn: () => getPublicValueCanvasFn({ data: { workshopId } }),
  });

  const [draft, setDraft] = useState<CanvasSections>(() => emptyCanvasSections());
  const [dirty, setDirty] = useState(false);
  const [language, setLanguage] = useState<ReportLanguage>("en");
  const [pdfBusy, setPdfBusy] = useState(false);
  const documents = useCanvasDocuments(workshopId);

  useEffect(() => {
    if (canvas.data && !dirty) setDraft(canvas.data.sections);
    // Loaded values only overwrite an untouched draft.
  }, [canvas.data, dirty]);

  const readiness = useMemo(() => assessCanvas(draft), [draft]);

  const save = useMutation({
    mutationFn: () => savePublicValueCanvasFn({ data: { workshopId, sections: draft } }),
    onSuccess: () => {
      setDirty(false);
      void queryClient.invalidateQueries({
        queryKey: ["workshop-public-value-canvas", workshopId],
      });
      toast.success("Canvas saved");
    },
    onError: (error) =>
      toast.error("Canvas not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const submitVersion = useMutation({
    mutationFn: () => recordPublicValueCanvasVersionFn({ data: { workshopId, sections: draft } }),
    onSuccess: (result) => {
      setDirty(false);
      void queryClient.invalidateQueries({
        queryKey: ["workshop-public-value-canvas", workshopId],
      });
      void queryClient.invalidateQueries({ queryKey: ["workshop-canvas-versions", workshopId] });
      toast.success(`Version ${result.version.version} recorded`);
    },
    onError: (error) =>
      toast.error("Version not recorded", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const update = (
    key: CanvasSection,
    patch: Partial<{ text: string; confidence: CanvasConfidence }>,
  ) => {
    setDirty(true);
    setDraft((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const slug =
    workshopTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workshop";

  const exportInput = () => ({
    workshopTitle,
    ...(organisation ? { organisation } : {}),
    generatedAt: new Date().toISOString(),
    sections: draft,
    language,
    documents: documents.data ?? [],
  });

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const input = exportInput();
      const { default: JsPDF } = await import("jspdf");
      const doc = new JsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const width = 500;
      let y = margin;
      const line = (text: string, size: number, gap: number) => {
        doc.setFontSize(size);
        for (const part of doc.splitTextToSize(text, width) as string[]) {
          if (y > 780) {
            doc.addPage();
            y = margin;
          }
          doc.text(part, margin, y);
          y += gap;
        }
      };

      line(`Sovereign Public Value Canvas — ${workshopTitle}`, 15, 20);
      for (const summary of buildCanvasSummaryLines(input)) line(summary, 10, 14);
      y += 8;
      for (const block of buildCanvasPdfBlocks(input)) {
        y += 6;
        line(block.heading, 12, 17);
        line(block.evidence, 9, 13);
        line(block.body, 10, 14);
      }
      doc.save(`public-value-canvas-${slug}-${language}-${stamp}.pdf`);
      toast.success("Canvas PDF exported");
    } catch (error) {
      toast.error("PDF export failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4" aria-hidden /> Sovereign Public Value Canvas™
              </CardTitle>
              <CardDescription>
                For public-sector services: mandate, affected groups, measured baseline, service
                standards, an honest AI-versus-alternatives comparison, human authority and redress,
                and where sovereignty sits.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as ReportLanguage)}
              >
                <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Export language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_LANGUAGES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {REPORT_LANGUAGE_LABEL[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download(
                    `public-value-canvas-${slug}-${language}-${stamp}.csv`,
                    "text/csv",
                    localizedCanvasToCsv(exportInput()),
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" aria-hidden /> CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download(
                    `public-value-canvas-${slug}-${language}-${stamp}.md`,
                    "text/markdown",
                    localizedCanvasToMarkdown(exportInput()),
                  )
                }
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden /> Markdown
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pdfBusy}
                onClick={() => void exportPdf()}
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden />
                {pdfBusy ? "Building…" : "PDF"}
              </Button>
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    disabled={save.isPending || !dirty}
                    onClick={() => save.mutate()}
                  >
                    <Save className="mr-2 h-4 w-4" aria-hidden />
                    {save.isPending ? "Saving…" : dirty ? "Save canvas" : "Saved"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={submitVersion.isPending}
                    onClick={() => submitVersion.mutate()}
                  >
                    <FileSignature className="mr-2 h-4 w-4" aria-hidden />
                    {submitVersion.isPending ? "Recording…" : "Submit version"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={readiness.reviewReady ? "default" : "outline"}>
                {readiness.answered}/{readiness.total} sections
              </Badge>
              <span className="text-muted-foreground">{readiness.headline}</span>
            </div>
            <Progress
              value={readiness.completeness}
              aria-label={`Canvas completeness ${readiness.completeness}%`}
            />
            {readiness.missing.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Still to answer:{" "}
                {readiness.missing.map((key) => CANVAS_SECTION_LABEL[key]).join(" · ")}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {canvas.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading the canvas…</p>
          ) : canvas.isError ? (
            <p className="text-sm text-destructive">
              {canvas.error instanceof Error
                ? canvas.error.message
                : "The canvas could not be loaded."}
            </p>
          ) : (
            CANVAS_META.map((meta, index) => {
              const entry = draft[meta.key];
              const fieldId = `canvas-${meta.key}`;
              return (
                <section key={meta.key} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={fieldId} className="text-sm font-semibold">
                        {index + 1}. {meta.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{meta.purpose}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isSectionAnswered(entry) ? "secondary" : "outline"}>
                        {isSectionAnswered(entry) ? "Answered" : "Empty"}
                      </Badge>
                      <Select
                        value={entry.confidence}
                        disabled={!canEdit}
                        onValueChange={(value) =>
                          update(meta.key, { confidence: value as CanvasConfidence })
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-[9.5rem]"
                          aria-label={`Evidence level for ${meta.label}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CANVAS_CONFIDENCE.map((level) => (
                            <SelectItem key={level} value={level}>
                              {CANVAS_CONFIDENCE_LABEL[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {meta.prompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                  <Textarea
                    id={fieldId}
                    rows={4}
                    maxLength={4000}
                    readOnly={!canEdit}
                    value={entry.text}
                    placeholder={canEdit ? meta.prompts[0] : "Nothing recorded yet."}
                    onChange={(event) => update(meta.key, { text: event.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {entry.text.trim().length}/4000 characters · at least {MIN_ANSWER_LENGTH} needed
                    to count as answered
                  </p>
                  <CanvasDocumentPanel
                    workshopId={workshopId}
                    section={meta.key}
                    sectionLabel={meta.label}
                    documents={documents.data ?? []}
                    canEdit={canEdit}
                  />
                </section>
              );
            })
          )}
          {!canEdit && (
            <p className="text-xs text-muted-foreground">
              Only workshop facilitators can edit the canvas. Exports stay available to every
              member.
            </p>
          )}
        </CardContent>
      </Card>

      <CanvasVersionHistory
        workshopId={workshopId}
        workshopTitle={workshopTitle}
        {...(organisation ? { organisation } : {})}
        language={language}
        onLanguageChange={setLanguage}
      />
    </div>
  );
}
