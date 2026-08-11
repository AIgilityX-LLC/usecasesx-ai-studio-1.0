/**
 * Report export — CSV download and print/PDF for the executive and portfolio
 * reports.
 *
 * PDF is produced through the browser print pipeline against the on-screen
 * report, so the exported document is exactly what the user reviewed. Nothing
 * is re-rendered server-side and no report content leaves the browser.
 *
 * Every entry point checks permission twice: the local role matrix for an
 * instant, honest message, then a server-side re-check (`authorizeReportExportFn`)
 * that resolves role, workspace membership and entitlement from the database.
 * A caller who fakes a role in the browser still gets refused.
 */

import {
  benefitsToCsv,
  reportFileName,
  buildUseCasesCsv,
  type ReportItemInput,
} from "@/lib/reports/report-model";
import {
  assertCanExportReport,
  ReportExportDeniedError,
  type ExportFormat,
} from "@/lib/reports/report-access";
import { authorizeReportExportFn } from "@/lib/reports/report-export.functions";

/**
 * Server is the boundary: the local matrix short-circuits obvious denials,
 * then the server re-derives role and entitlement from the database.
 */
async function authorize(
  role: string | null | undefined,
  format: ExportFormat,
  workspaceId?: string | null,
  subject?: string | null,
): Promise<void> {
  assertCanExportReport(role, format);
  const verdict = await authorizeReportExportFn({
    data: { format, workspaceId: workspaceId ?? null, subject: subject ?? null },
  });
  if (!verdict.allowed) throw new ReportExportDeniedError(format, role, verdict.reason);
}

function downloadText(filename: string, mime: string, text: string) {
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

export async function downloadUseCaseCsv(
  items: ReportItemInput[],
  kind: string,
  role: string | null | undefined,
  workspaceId?: string | null,
): Promise<string> {
  await authorize(role, "csv", workspaceId, kind);
  const filename = `${reportFileName(kind)}.csv`;
  downloadText(filename, "text/csv", buildUseCasesCsv(items));
  return filename;
}

export async function downloadBenefitsCsv(
  items: ReportItemInput[],
  kind: string,
  role: string | null | undefined,
  workspaceId?: string | null,
): Promise<string> {
  await authorize(role, "csv_benefits", workspaceId, `${kind}-benefits`);
  const filename = `${reportFileName(`${kind}-benefits`)}.csv`;
  downloadText(filename, "text/csv", benefitsToCsv(items));
  return filename;
}

/** Opens the browser print dialog; users pick "Save as PDF" from there. */
export async function printReport(
  role: string | null | undefined,
  workspaceId?: string | null,
  kind?: string | null,
): Promise<void> {
  await authorize(role, "pdf", workspaceId, kind ?? "report");
  window.print();
}
