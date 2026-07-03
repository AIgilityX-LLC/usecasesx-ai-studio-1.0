import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

export type ExportSection =
  | { heading: string; kind: "text"; body: string }
  | { heading: string; kind: "table"; columns: string[]; rows: string[][] };

export interface ExportDoc {
  title: string;
  subtitle?: string;
  sections: ExportSection[];
}

export function exportDeliverablePDF(doc: ExportDoc, fileName: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const width = pageW - margin * 2;
  let y = margin;

  const ensure = (needed: number) => {
    if (y > pageH - margin - needed) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(pdf.splitTextToSize(doc.title, width), margin, y);
  y += 26;
  if (doc.subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(120);
    pdf.text(pdf.splitTextToSize(doc.subtitle, width), margin, y);
    pdf.setTextColor(0);
    y += 20;
  }
  y += 6;

  doc.sections.forEach((section) => {
    ensure(40);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(section.heading, margin, y);
    y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    if (section.kind === "text") {
      const lines = pdf.splitTextToSize(section.body?.trim() || "—", width);
      lines.forEach((line: string) => {
        ensure(13);
        pdf.text(line, margin, y);
        y += 13;
      });
    } else {
      const colW = width / section.columns.length;
      pdf.setFont("helvetica", "bold");
      section.columns.forEach((c, i) => {
        pdf.text(pdf.splitTextToSize(c, colW - 4), margin + i * colW, y);
      });
      y += 14;
      pdf.setFont("helvetica", "normal");
      section.rows.forEach((row) => {
        const cellLines = row.map((cell, i) =>
          pdf.splitTextToSize(cell || "—", colW - 4),
        );
        const rowH = Math.max(...cellLines.map((l) => l.length)) * 12 + 4;
        ensure(rowH);
        cellLines.forEach((lines, i) => {
          pdf.text(lines, margin + i * colW, y);
        });
        y += rowH;
      });
    }
    y += 12;
  });

  pdf.save(fileName);
}

export async function exportDeliverableWord(doc: ExportDoc, fileName: string) {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(doc.title)] }),
  ];
  if (doc.subtitle) {
    children.push(new Paragraph({ children: [new TextRun({ text: doc.subtitle, italics: true })] }));
  }

  doc.sections.forEach((section) => {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(section.heading)] }),
    );
    if (section.kind === "text") {
      (section.body || "—").split("\n").forEach((line) => {
        children.push(new Paragraph({ children: [new TextRun(line)] }));
      });
    } else {
      const headerRow = new TableRow({
        children: section.columns.map(
          (c) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })],
            }),
        ),
      });
      const bodyRows = section.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun(cell || "—")] })],
                }),
            ),
          }),
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows],
        }),
      );
    }
  });

  const document = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(document);
  saveAs(blob, fileName);
}