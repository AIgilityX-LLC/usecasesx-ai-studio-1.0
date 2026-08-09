import { useCallback, useMemo, useState } from "react";
import * as adminRepo from "@/lib/domain/admin.repository";
import { toUserMessage } from "@/lib/domain/errors";
import {
  buildImportPlan,
  parseCsv,
  summarizeOutcomes,
  IMPORT_COLUMNS,
  type DuplicateStrategy,
  type ImportPlan,
  type RowOutcome,
} from "@/lib/admin/csv-import";
import { usePlatformAdmin } from "@/lib/admin/platform-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from "lucide-react";

const TEMPLATE = `${IMPORT_COLUMNS.join(",")}\n"Predictive demand forecasting","predictive-demand-forecasting","Forecast SKU-level demand to cut stockouts and markdowns across the network.","Planners rely on spreadsheets and miss demand shifts.","Gradient-boosted forecasting on POS and inventory history.","retail","supply-chain","machine-learning","High","Medium","Medium","curated","reviewed","Internal advisory library"\n`;

const STRATEGY_LABEL: Record<DuplicateStrategy, string> = {
  skip: "Skip duplicates",
  update: "Update existing record",
  create_new: "Create a new record with a unique slug",
};

export function CsvImportPanel() {
  const { canImport } = usePlatformAdmin();
  const [text, setText] = useState("");
  const [strategy, setStrategy] = useState<DuplicateStrategy>("skip");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [outcomes, setOutcomes] = useState<RowOutcome[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readFile = useCallback(async (file: File) => {
    setText(await file.text());
    setPlan(null);
    setOutcomes(null);
  }, []);

  const validate = useCallback(async () => {
    setValidating(true);
    setError(null);
    setOutcomes(null);
    try {
      const [existingBySlug, taxonomy] = await Promise.all([
        adminRepo.fetchUseCaseSlugMap(),
        adminRepo.fetchTaxonomySlugSets(),
      ]);
      setPlan(
        buildImportPlan(parseCsv(text), {
          existingBySlug,
          strategy,
          knownIndustries: taxonomy.industries,
          knownFunctions: taxonomy.functions,
          knownCapabilities: taxonomy.capabilities,
        }),
      );
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setValidating(false);
    }
  }, [text, strategy]);

  const apply = useCallback(async () => {
    if (!plan) return;
    setApplying(true);
    setError(null);
    const results: RowOutcome[] = [];
    for (const row of plan.rows) {
      if (row.action === "error") {
        results.push({
          lineNumber: row.lineNumber,
          slug: row.values.slug,
          status: "failed",
          message: row.issues.find((i) => i.severity === "error")?.message,
        });
        continue;
      }
      if (row.action === "skip") {
        results.push({ lineNumber: row.lineNumber, slug: row.values.slug, status: "skipped" });
        continue;
      }
      try {
        await adminRepo.applyImportRow(row.action, row.values, row.existingId);
        results.push({
          lineNumber: row.lineNumber,
          slug: row.values.slug,
          status: row.action === "update" ? "updated" : "created",
        });
      } catch (e) {
        // Partial failure: keep going, report the row, leave earlier writes intact.
        results.push({
          lineNumber: row.lineNumber,
          slug: row.values.slug,
          status: "failed",
          message: toUserMessage(e),
        });
      }
    }
    setOutcomes(results);
    setPlan(null);
    setApplying(false);
  }, [plan]);

  const totals = useMemo(() => (outcomes ? summarizeOutcomes(outcomes) : null), [outcomes]);

  if (!canImport) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Platform admin only</AlertTitle>
        <AlertDescription>
          Bulk import of global repository content is restricted to platform administrators.
          Workspace administration does not grant this.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import global use cases from CSV</CardTitle>
          <CardDescription>
            Every file is validated before anything is written. Imported records always land as
            hidden drafts — publishing stays a separate, audited action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="csv-file" className="sr-only">
              CSV file
            </Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setText(TEMPLATE);
                setPlan(null);
                setOutcomes(null);
              }}
            >
              Load template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-text">CSV content</Label>
            <Textarea
              id="csv-text"
              rows={8}
              value={text}
              spellCheck={false}
              onChange={(e) => {
                setText(e.target.value);
                setPlan(null);
                setOutcomes(null);
              }}
              placeholder={IMPORT_COLUMNS.join(",")}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Required columns: <code>title</code>, <code>summary</code>. Taxonomy columns accept
              existing slugs only.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="dup-strategy">Duplicate slug strategy</Label>
              <Select
                value={strategy}
                onValueChange={(v) => {
                  setStrategy(v as DuplicateStrategy);
                  setPlan(null);
                }}
              >
                <SelectTrigger id="dup-strategy" className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STRATEGY_LABEL) as DuplicateStrategy[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {STRATEGY_LABEL[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => void validate()}
              disabled={validating || text.trim().length === 0}
              data-testid="csv-validate"
            >
              {validating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              Validate &amp; preview
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Import could not be validated</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {plan && (
        <Card data-testid="csv-preview">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              {plan.summary.total} rows · {plan.summary.create} to create · {plan.summary.update} to
              update · {plan.summary.skip} skipped · {plan.summary.error} with errors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.fileErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>File problems</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {plan.fileErrors.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Rows detected in the uploaded CSV</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th scope="col" className="py-2 pr-3">
                      Row
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Title
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Slug
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Action
                    </th>
                    <th scope="col" className="py-2">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((row) => (
                    <tr key={row.lineNumber} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-3 tabular-nums">{row.lineNumber}</td>
                      <td className="py-2 pr-3">{row.values.title || "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.values.slug || "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={row.action === "error" ? "destructive" : "secondary"}>
                          {row.action}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {row.reason}
                        {row.issues.map((i) => (
                          <div
                            key={`${i.field}-${i.message}`}
                            className={i.severity === "error" ? "text-destructive" : undefined}
                          >
                            {i.field}: {i.message}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => void apply()}
                disabled={
                  applying ||
                  plan.fileErrors.length > 0 ||
                  plan.summary.create + plan.summary.update === 0
                }
                data-testid="csv-confirm"
              >
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm import ({plan.summary.create + plan.summary.update} rows)
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPlan(null)}>
                Cancel
              </Button>
              {plan.summary.error > 0 && (
                <span className="text-xs text-muted-foreground">
                  Rows with errors are never written.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {outcomes && totals && (
        <Card data-testid="csv-results">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Import finished
            </CardTitle>
            <CardDescription>
              {totals.created} created · {totals.updated} updated · {totals.skipped} skipped ·{" "}
              {totals.failed} failed. Imported records are hidden drafts until published.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {outcomes.map((o) => (
                <li key={`${o.lineNumber}-${o.slug}`}>
                  <span className="tabular-nums text-muted-foreground">Row {o.lineNumber}</span>{" "}
                  <span className="font-mono text-xs">{o.slug}</span>{" "}
                  <Badge variant={o.status === "failed" ? "destructive" : "secondary"}>
                    {o.status}
                  </Badge>
                  {o.message && (
                    <span className="ml-2 text-xs text-muted-foreground">{o.message}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
