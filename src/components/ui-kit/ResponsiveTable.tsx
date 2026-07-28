import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ResponsiveColumn<T> = {
  key: string;
  header: ReactNode;
  /** Cell renderer. Also used for the stacked mobile card. */
  cell: (row: T) => ReactNode;
  /** Hide this column from the stacked mobile card (e.g. redundant labels). */
  hideOnMobile?: boolean;
  className?: string;
};

/**
 * Table on >= md, stacked label/value cards below it. Prevents the horizontal
 * overflow that plain `<Table>` causes at 360–420px widths.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  onRowClick,
  className,
}: {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-xl border border-border bg-card p-4",
              onRowClick && "cursor-pointer",
            )}
          >
            <dl className="space-y-2">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div
                    key={column.key}
                    className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3"
                  >
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {column.header}
                    </dt>
                    <dd className="min-w-0 text-sm text-foreground">{column.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
