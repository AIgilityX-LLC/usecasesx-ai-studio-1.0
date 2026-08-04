/**
 * Opportunity Map export.
 *
 * Pure builders (matrix CSV, record CSV, JSON) plus a thin browser download
 * helper. Exports carry exactly what is in view — the same filtered records
 * and the same intensity arithmetic the grid renders, so an exported file
 * always reconciles with the screen it came from.
 */

import saveAs from "file-saver";

import {
  buildMatrix,
  cellId,
  formatValue,
  INTENSITY_BAND_LABELS,
  INTENSITY_EXPLANATION,
  recordWeight,
  ROW_AXIS_LABELS,
  UNASSIGNED_LABEL,
  type MapRecord,
  type RowAxis,
} from "@/lib/opportunity-map";
import { STATUS_META, URGENCY_LABELS } from "@/lib/opportunities";

export type MapExportFormat = "matrix-csv" | "records-csv" | "json";

export function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const toCsv = (rows: (string | number | null | undefined)[][]) =>
  rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");

const statusLabel = (status: string) =>
  (STATUS_META as Record<string, { label?: string }>)[status]?.label ?? status;

const urgencyLabel = (urgency: string) =>
  (URGENCY_LABELS as Record<string, string>)[urgency] ?? urgency;

/** Grid view: rows x value themes, weighted value plus record count. */
export function mapMatrixToCsv(records: MapRecord[], axis: RowAxis): string {
  const matrix = buildMatrix(records, axis);
  const header = [
    ROW_AXIS_LABELS[axis],
    ...matrix.columns.flatMap((column) => [`${column.label} — value`, `${column.label} — records`]),
    "Row total value",
    "Row total records",
  ];

  const body = matrix.rows.map((row) => {
    let rowValue = 0;
    let rowCount = 0;
    const cells = matrix.columns.flatMap((column) => {
      const cell = matrix.cells.get(cellId(row.key, column.key));
      rowValue += cell?.value ?? 0;
      rowCount += cell?.count ?? 0;
      return [cell ? formatValue(cell.value) : "0", cell?.count ?? 0];
    });
    return [row.label, ...cells, formatValue(rowValue), rowCount];
  });

  const totals = [
    "All rows",
    ...matrix.columns.flatMap((column) => {
      let value = 0;
      let count = 0;
      for (const row of matrix.rows) {
        const cell = matrix.cells.get(cellId(row.key, column.key));
        value += cell?.value ?? 0;
        count += cell?.count ?? 0;
      }
      return [formatValue(value), count];
    }),
    formatValue(matrix.totalValue),
    matrix.totalRecords,
  ];

  return toCsv([header, ...body, totals]);
}

/** Record view: one row per opportunity currently in view. */
export function mapRecordsToCsv(records: MapRecord[]): string {
  const header = [
    "Title",
    "Organization unit",
    "Business function",
    "Strategic value theme",
    "Lifecycle status",
    "Urgency",
    "Owner",
    "Weighted value",
    "Converted to use case",
    "Last updated",
  ];
  const body = records.map((record) => [
    record.title,
    record.orgUnitName || UNASSIGNED_LABEL,
    record.businessFunction || UNASSIGNED_LABEL,
    record.strategicThemeName || UNASSIGNED_LABEL,
    statusLabel(record.status),
    urgencyLabel(record.urgency),
    record.ownerName || "Unassigned",
    formatValue(recordWeight(record)),
    record.convertedUseCaseId ? "Yes" : "No",
    record.updatedAt,
  ]);
  return toCsv([header, ...body]);
}

/** Machine-readable export: axis, cells and the records behind them. */
export function mapToJson(records: MapRecord[], axis: RowAxis): string {
  const matrix = buildMatrix(records, axis);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      axis,
      axisLabel: ROW_AXIS_LABELS[axis],
      methodology: INTENSITY_EXPLANATION,
      totals: { records: matrix.totalRecords, value: matrix.totalValue },
      rows: matrix.rows,
      columns: matrix.columns,
      cells: matrix.rows.flatMap((row) =>
        matrix.columns
          .map((column) => matrix.cells.get(cellId(row.key, column.key)))
          .filter((cell): cell is NonNullable<typeof cell> => Boolean(cell))
          .map((cell) => ({
            row: row.label,
            column: matrix.columns.find((c) => c.key === cell.columnKey)?.label ?? cell.columnKey,
            records: cell.count,
            convertedRecords: cell.convertedCount,
            value: cell.value,
            intensity: INTENSITY_BAND_LABELS[cell.band],
            recordIds: cell.records.map((record) => record.id),
          })),
      ),
      records,
    },
    null,
    2,
  );
}

export function mapExportFileName(format: MapExportFormat, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  const suffix = format === "records-csv" ? "records" : format === "json" ? "data" : "grid";
  return `opportunity-map-${suffix}-${stamp}.${format === "json" ? "json" : "csv"}`;
}

/** Browser-only download. Builders above stay pure and testable. */
export function downloadOpportunityMap(
  records: MapRecord[],
  axis: RowAxis,
  format: MapExportFormat,
) {
  const content =
    format === "matrix-csv"
      ? mapMatrixToCsv(records, axis)
      : format === "records-csv"
        ? mapRecordsToCsv(records)
        : mapToJson(records, axis);
  const type = format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8";
  saveAs(new Blob([content], { type }), mapExportFileName(format));
}
