/**
 * Report export — CSV download and print/PDF for the executive and portfolio
 * reports.
 *
 * PDF is produced through the browser print pipeline against the on-screen
 * report, so the exported document is exactly what the user reviewed. Nothing
 * is re-rendered server-side and no report content leaves the browser.
 */

import {
  benefitsToCsv,
  reportFileName,
  buildUseCasesCsv,
  type ReportItemInput,
} from "@/lib/reports/report-model";

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

export function downloadUseCaseCsv(items: ReportItemInput[], kind: string): string {
  const filename = `${reportFileName(kind)}.csv`;
  downloadText(filename, "text/csv", buildUseCasesCsv(items));
  return filename;
}

export function downloadBenefitsCsv(items: ReportItemInput[], kind: string): string {
  const filename = `${reportFileName(`${kind}-benefits`)}.csv`;
  downloadText(filename, "text/csv", benefitsToCsv(items));
  return filename;
}

/** Opens the browser print dialog; users pick "Save as PDF" from there. */
export function printReport(): void {
  window.print();
}
