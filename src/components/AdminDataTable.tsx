import type { ReactNode } from "react";

export interface Column<T> { key: string; header: string; render: (row: T) => ReactNode; width?: string; }

export function AdminDataTable<T extends { id: string }>({ rows, columns, empty }: { rows: T[]; columns: Column<T>[]; empty?: ReactNode }) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/60">
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-foreground">{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
