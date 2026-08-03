import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  buildMatrix,
  cellId,
  formatValue,
  INTENSITY_BAND_LABELS,
  ROW_AXIS_LABELS,
  UNASSIGNED_LABEL,
  type IntensityBand,
  type MapCell,
  type MapRecord,
  type RowAxis,
} from "@/lib/opportunity-map";
import { STATUS_META, URGENCY_LABELS, type OpportunityStatus } from "@/lib/opportunities";
import { StatusChip } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Shading bands map to semantic tokens only. */
const BAND_CLASSES: Record<IntensityBand, string> = {
  none: "bg-muted/40 text-muted-foreground",
  low: "bg-primary/10 text-foreground",
  moderate: "bg-primary/25 text-foreground",
  high: "bg-primary/45 text-foreground",
  highest: "bg-primary/65 text-foreground",
};

export function OpportunityMapGrid({
  records,
  axis,
  view,
}: {
  records: MapRecord[];
  axis: RowAxis;
  view: "map" | "table";
}) {
  const matrix = useMemo(() => buildMatrix(records, axis), [records, axis]);
  const [openCell, setOpenCell] = useState<MapCell | null>(null);

  const describe = (cell: MapCell | undefined, rowLabel: string, columnLabel: string) =>
    cell
      ? `${rowLabel}, ${columnLabel}: ${cell.count} record${cell.count === 1 ? "" : "s"}, value ${formatValue(cell.value)}, ${INTENSITY_BAND_LABELS[cell.band]} intensity. Open the records.`
      : `${rowLabel}, ${columnLabel}: no records.`;

  const flat = useMemo(
    () =>
      matrix.rows.flatMap((row) =>
        matrix.columns
          .map((column) => ({
            row,
            column,
            cell: matrix.cells.get(cellId(row.key, column.key)),
          }))
          .filter((entry) => entry.cell),
      ),
    [matrix],
  );

  return (
    <>
      {view === "map" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
            <caption className="sr-only">
              Opportunity Map: {ROW_AXIS_LABELS[axis]} by strategic value theme. Each cell shows the
              record count and the weighted value indicator.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-background p-2 text-left font-semibold">
                  {ROW_AXIS_LABELS[axis]}
                </th>
                {matrix.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="p-2 text-left align-bottom text-xs font-semibold"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.key}>
                  <th
                    scope="row"
                    className="sticky left-0 bg-background p-2 text-left text-xs font-medium"
                  >
                    {row.label}
                  </th>
                  {matrix.columns.map((column) => {
                    const cell = matrix.cells.get(cellId(row.key, column.key));
                    return (
                      <td key={column.key} className="p-0">
                        {cell ? (
                          <button
                            type="button"
                            onClick={() => setOpenCell(cell)}
                            aria-label={describe(cell, row.label, column.label)}
                            className={cn(
                              "flex h-16 w-full flex-col items-center justify-center rounded-md ring-1 ring-inset ring-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:ring-primary",
                              BAND_CLASSES[cell.band],
                            )}
                          >
                            <span className="text-base font-semibold">{cell.count}</span>
                            <span className="text-[10px] uppercase tracking-wide">
                              value {formatValue(cell.value)}
                            </span>
                          </button>
                        ) : (
                          <div
                            className="flex h-16 items-center justify-center rounded-md bg-muted/20 text-xs text-muted-foreground ring-1 ring-inset ring-border"
                            aria-label={describe(undefined, row.label, column.label)}
                          >
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">
              Accessible table view of the same Opportunity Map cells.
            </caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="p-2">
                  {ROW_AXIS_LABELS[axis]}
                </th>
                <th scope="col" className="p-2">
                  Value theme
                </th>
                <th scope="col" className="p-2">
                  Records
                </th>
                <th scope="col" className="p-2">
                  Converted
                </th>
                <th scope="col" className="p-2">
                  Value
                </th>
                <th scope="col" className="p-2">
                  Intensity
                </th>
                <th scope="col" className="p-2">
                  Records
                </th>
              </tr>
            </thead>
            <tbody>
              {flat.map(({ row, column, cell }) => (
                <tr key={cellId(row.key, column.key)} className="border-b last:border-0">
                  <td className="p-2">{row.label}</td>
                  <td className="p-2">{column.label}</td>
                  <td className="p-2">{cell!.count}</td>
                  <td className="p-2">{cell!.convertedCount}</td>
                  <td className="p-2">{formatValue(cell!.value)}</td>
                  <td className="p-2">{INTENSITY_BAND_LABELS[cell!.band]}</td>
                  <td className="p-2">
                    <Button size="sm" variant="outline" onClick={() => setOpenCell(cell!)}>
                      Open {cell!.count}
                    </Button>
                  </td>
                </tr>
              ))}
              {flat.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    No records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!openCell} onOpenChange={(open) => !open && setOpenCell(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {openCell
                ? `${matrix.rows.find((r) => r.key === openCell.rowKey)?.label ?? UNASSIGNED_LABEL} · ${
                    matrix.columns.find((c) => c.key === openCell.columnKey)?.label ??
                    UNASSIGNED_LABEL
                  }`
                : ""}
            </SheetTitle>
            <SheetDescription>
              {openCell
                ? `${openCell.count} record${openCell.count === 1 ? "" : "s"} · weighted value ${formatValue(openCell.value)} · ${INTENSITY_BAND_LABELS[openCell.band]} intensity`
                : ""}
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-4 space-y-2">
            {(openCell?.records ?? []).map((record) => {
              const meta = STATUS_META[record.status as OpportunityStatus];
              return (
                <li key={record.id} className="rounded-md border p-3">
                  <Link
                    to="/opportunities/$id"
                    params={{ id: record.id }}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {record.title || "Untitled opportunity"}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusChip tone={meta?.tone ?? "neutral"}>
                      {meta?.label ?? record.status}
                    </StatusChip>
                    <span>
                      {URGENCY_LABELS[record.urgency as keyof typeof URGENCY_LABELS] ??
                        record.urgency}
                    </span>
                    {record.ownerName && <span>Owner: {record.ownerName}</span>}
                    {record.convertedUseCaseId && <span>Converted to a Studio use case</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
