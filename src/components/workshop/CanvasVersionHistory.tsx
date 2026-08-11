/**
 * Version history for the Sovereign Public Value Canvas™.
 *
 * Each submission is an append-only snapshot, so admins can compare what
 * changed between two versions and export any prior version in the language of
 * their choice. Nothing here is recomputed from the live draft.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REPORT_LANGUAGE_LABEL,
  REPORT_LANGUAGES,
  reportStrings,
  type ReportLanguage,
} from "@/lib/i18n/report-language";
import {
  canvasVersionsToCsv,
  diffCanvasVersions,
  versionHistoryRows,
} from "@/lib/workshops.canvas-evidence";
import {
  localizedCanvasToCsv,
  localizedCanvasToMarkdown,
} from "@/lib/workshops.public-value.export";
import { CANVAS_SECTION_LABEL } from "@/lib/workshops.public-value";
import { listPublicValueCanvasVersionsFn } from "@/lib/workshops.functions";

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

const CHANGE_LABEL: Record<string, string> = {
  added: "Added",
  edited: "Edited",
  removed: "Cleared",
  unchanged: "Unchanged",
};

export function CanvasVersionHistory({
  workshopId,
  workshopTitle,
  organisation,
  language,
  onLanguageChange,
}: {
  workshopId: string;
  workshopTitle: string;
  organisation?: string;
  language: ReportLanguage;
  onLanguageChange: (language: ReportLanguage) => void;
}) {
  const versions = useQuery({
    queryKey: ["workshop-canvas-versions", workshopId],
    queryFn: () => listPublicValueCanvasVersionsFn({ data: { workshopId } }),
  });

  const rows = useMemo(() => versionHistoryRows(versions.data ?? []), [versions.data]);
  const [selected, setSelected] = useState<number | null>(null);
  const current = rows.find((row) => row.version === selected) ?? rows[0] ?? null;
  const previous = current
    ? (rows.find((row) => row.version === current.version - 1) ?? null)
    : null;
  const diff = current ? diffCanvasVersions(previous, current) : null;
  const t = reportStrings(language);
  const slug =
    workshopTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workshop";

  const exportVersion = (kind: "csv" | "md") => {
    if (!current) return;
    const input = {
      workshopTitle,
      ...(organisation ? { organisation } : {}),
      generatedAt: new Date().toISOString(),
      sections: current.sections,
      language,
      version: current.version,
    };
    const name = `public-value-canvas-${slug}-v${current.version}-${language}`;
    if (kind === "csv") download(`${name}.csv`, "text/csv", localizedCanvasToCsv(input));
    else download(`${name}.md`, "text/markdown", localizedCanvasToMarkdown(input));
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" aria-hidden /> Canvas version history
            </CardTitle>
            <CardDescription>
              Every submission is kept as a snapshot, so changes between reviews stay comparable and
              any earlier version can be exported.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="canvas-report-language" className="text-xs">
                Export language
              </Label>
              <Select
                value={language}
                onValueChange={(value) => onLanguageChange(value as ReportLanguage)}
              >
                <SelectTrigger id="canvas-report-language" className="h-8 w-[9.5rem]">
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
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={rows.length === 0}
              onClick={() =>
                download(
                  `public-value-canvas-${slug}-versions.csv`,
                  "text/csv",
                  canvasVersionsToCsv(rows, language),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" aria-hidden /> History CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {versions.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading version history…</p>
        ) : versions.isError ? (
          <p className="text-sm text-destructive">Version history could not be loaded.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No version has been submitted yet. Use “Submit version” on the canvas to record the
            first snapshot.
          </p>
        ) : (
          <>
            <ul className="space-y-1">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row.version)}
                    aria-pressed={current?.version === row.version}
                    className="flex w-full flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent aria-pressed:border-primary"
                  >
                    <Badge variant="outline">
                      {t.version} {row.version}
                    </Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {row.answered}/7 · {row.completeness}%
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {row.note ?? "No note recorded"}
                    </span>
                    <time dateTime={row.createdAt} className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </time>
                  </button>
                </li>
              ))}
            </ul>

            {current && diff && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium">
                  {t.version} {current.version}
                  {previous ? ` vs ${previous.version}` : " (first snapshot)"} — {diff.headline}
                </p>
                <ul className="grid gap-1 text-xs sm:grid-cols-2">
                  {diff.changes.map((change) => (
                    <li key={change.section} className="flex items-center gap-2">
                      <Badge variant={change.change === "unchanged" ? "outline" : "secondary"}>
                        {CHANGE_LABEL[change.change]}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate">
                        {CANVAS_SECTION_LABEL[change.section]}
                      </span>
                      {change.confidenceChanged && (
                        <span className="text-muted-foreground">
                          {change.fromConfidence} → {change.toConfidence}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => exportVersion("csv")}>
                    <Download className="mr-2 h-4 w-4" aria-hidden /> Export v{current.version} CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportVersion("md")}>
                    <FileText className="mr-2 h-4 w-4" aria-hidden /> Export v{current.version}
                    &nbsp;Markdown
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
