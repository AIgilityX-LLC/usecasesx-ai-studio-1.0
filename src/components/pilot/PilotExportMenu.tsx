import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

import {
  FUNNEL_PDF_COLUMNS,
  buildFunnelPdfRows,
  buildFunnelSummaryLines,
  pilotAdvisoryInterestToCsv,
  pilotAuditToCsv,
  pilotCheckpointsToCsv,
  pilotFunnelToCsv,
} from "@/lib/pilot/pilot.export";
import type {
  PilotAuditEvent,
  PilotCheckpointResponse,
  PilotCohortRow,
  PilotCohortSummary,
} from "@/lib/pilot/pilot.model";
import { Button } from "@/components/ui/button";

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

/**
 * Admin exports for the pilot: funnel metrics, checkpoint responses (with the
 * mission references behind them), advisory interest and the audit trail. CSV is
 * built from the same pure builders the PDF uses, so both always agree.
 */
export function PilotExportMenu({
  cohort,
  summary,
  rows,
  checkpoints,
  audit,
  emailByUserId,
}: {
  cohort: string;
  summary: PilotCohortSummary;
  rows: PilotCohortRow[];
  checkpoints: PilotCheckpointResponse[];
  audit: PilotAuditEvent[];
  emailByUserId: Record<string, string>;
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = (part: string) => `pilot-${cohort}-${part}-${stamp}`;

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const { default: JsPDF } = await import("jspdf");
      const doc = new JsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      let y = margin;

      doc.setFontSize(16);
      doc.text(`Pilot programme — cohort ${cohort}`, margin, y);
      y += 20;
      doc.setFontSize(10);
      doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
      y += 24;

      doc.setFontSize(12);
      doc.text("Funnel", margin, y);
      y += 16;
      doc.setFontSize(10);
      for (const line of buildFunnelSummaryLines(summary)) {
        doc.text(line, margin, y);
        y += 14;
      }

      y += 12;
      doc.setFontSize(12);
      doc.text("Participants", margin, y);
      y += 16;
      doc.setFontSize(9);
      const columnX = [margin, margin + 230, margin + 320, margin + 390, margin + 460];
      FUNNEL_PDF_COLUMNS.forEach((column, index) => {
        doc.text(column, columnX[index] ?? margin, y);
      });
      y += 12;
      for (const row of buildFunnelPdfRows(rows)) {
        if (y > 780) {
          doc.addPage();
          y = margin;
        }
        row.forEach((cell, index) => {
          doc.text(String(cell).slice(0, 42), columnX[index] ?? margin, y);
        });
        y += 13;
      }

      doc.save(`${name("funnel")}.pdf`);
      toast.success("Pilot PDF exported");
    } catch (error) {
      toast.error("PDF export failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const csv = (part: string, body: string, emptyMessage: string) => {
    if (!body.trim()) {
      toast.info(emptyMessage);
      return;
    }
    downloadText(`${name(part)}.csv`, "text/csv", body);
    toast.success("Export downloaded");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => csv("funnel", pilotFunnelToCsv(rows), "No participants to export yet.")}
      >
        <Download className="mr-2 h-4 w-4" aria-hidden /> Funnel CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          csv(
            "checkpoints",
            pilotCheckpointsToCsv(checkpoints, emailByUserId),
            "No checkpoint answers to export yet.",
          )
        }
      >
        <Download className="mr-2 h-4 w-4" aria-hidden /> Checkpoints CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          csv(
            "advisory-interest",
            pilotAdvisoryInterestToCsv(rows, checkpoints),
            "Nobody has signalled advisory interest yet.",
          )
        }
      >
        <Download className="mr-2 h-4 w-4" aria-hidden /> Advisory interest CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => csv("audit", pilotAuditToCsv(audit), "The audit trail is empty.")}
      >
        <Download className="mr-2 h-4 w-4" aria-hidden /> Audit trail CSV
      </Button>
      <Button size="sm" disabled={pdfBusy} onClick={() => void exportPdf()}>
        <FileText className="mr-2 h-4 w-4" aria-hidden />
        {pdfBusy ? "Building…" : "Funnel PDF"}
      </Button>
    </div>
  );
}
