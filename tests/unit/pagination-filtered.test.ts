/**
 * Keyset paging *combined with search and status filters*.
 *
 * A filter changes which rows exist in the ordered stream, so a cursor derived
 * from a filtered page must still land exactly between rows of the same filtered
 * stream. These tests page through a simulated table with the filter applied
 * server-side (as PostgREST does) and assert the properties users notice:
 *
 * - no duplicates and no gaps across pages, for every filter combination
 * - the paged result equals the full filtered set in the same order
 * - ties on the sort column do not repeat or skip rows
 * - rows that stop matching mid-walk never corrupt the remaining pages
 */
import { describe, expect, it } from "bun:test";
import { buildPage, collectPages } from "@/lib/domain/pagination";

type Status = "draft" | "reviewed" | "published";
interface Row {
  id: string;
  title: string;
  status: Status;
  sortAt: string;
}
type Cursor = { sortAt: string; id: string };
interface Filter {
  search?: string;
  statuses?: Status[];
}

/** sortAt DESC, id ASC — the order both list readers use. */
function compare(a: Row, b: Row): number {
  if (a.sortAt !== b.sortAt) return a.sortAt < b.sortAt ? 1 : -1;
  return a.id < b.id ? -1 : 1;
}

function matches(row: Row, filter: Filter): boolean {
  if (filter.statuses && !filter.statuses.includes(row.status)) return false;
  if (filter.search && !row.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
  return true;
}

function afterCursor(row: Row, cursor: Cursor): boolean {
  if (row.sortAt < cursor.sortAt) return true;
  return row.sortAt === cursor.sortAt && row.id > cursor.id;
}

/** Simulated filtered, keyset-paged table read. */
function makeReader(store: () => Row[], filter: Filter) {
  return async (cursor: Cursor | null, pageSize: number) => {
    const fetched = store()
      .filter((row) => matches(row, filter))
      .filter((row) => (cursor ? afterCursor(row, cursor) : true))
      .sort(compare)
      .slice(0, pageSize + 1);
    return buildPage<Row, Cursor>(fetched, pageSize, (row) => ({
      sortAt: row.sortAt,
      id: row.id,
    }));
  };
}

function expected(rows: Row[], filter: Filter): string[] {
  return rows
    .filter((row) => matches(row, filter))
    .sort(compare)
    .map((row) => row.id);
}

const STATUSES: Status[] = ["draft", "reviewed", "published"];
const TITLES = [
  "Fraud triage copilot",
  "Permit intake triage",
  "Grid load forecast",
  "Fraud alerts",
];

/** 240 rows, deliberately full of sort-column ties. */
function corpus(): Row[] {
  return Array.from({ length: 240 }, (_, index) => ({
    id: `row-${String(index).padStart(4, "0")}`,
    title: TITLES[index % TITLES.length]!,
    status: STATUSES[index % STATUSES.length]!,
    // 4 rows share every timestamp -> ties on the sort column.
    sortAt: new Date(1_800_000_000_000 - Math.floor(index / 4) * 60_000).toISOString(),
  }));
}

const FILTERS: { name: string; filter: Filter }[] = [
  { name: "no filter", filter: {} },
  { name: "status only", filter: { statuses: ["published"] } },
  { name: "two statuses", filter: { statuses: ["draft", "reviewed"] } },
  { name: "search only", filter: { search: "fraud" } },
  { name: "search + status", filter: { search: "triage", statuses: ["draft"] } },
  { name: "filter that matches nothing", filter: { search: "no-such-title" } },
];

describe("keyset pagination with search and status filters", () => {
  for (const { name, filter } of FILTERS) {
    for (const pageSize of [1, 7, 50]) {
      it(`is duplicate-free and gap-free: ${name}, pageSize ${pageSize}`, async () => {
        const rows = corpus();
        const read = makeReader(() => rows, filter);
        const result = await collectPages<Row, Cursor>((cursor) => read(cursor, pageSize), 5_000);

        const ids = result.rows.map((row) => row.id);
        expect(new Set(ids).size).toBe(ids.length); // no duplicates
        expect(ids).toEqual(expected(rows, filter)); // no gaps, same order
        expect(result.truncated).toBe(false);
      });
    }
  }

  it("respects the row cap without dropping rows before it", async () => {
    const rows = corpus();
    const filter: Filter = { statuses: ["published"] };
    const read = makeReader(() => rows, filter);
    const result = await collectPages<Row, Cursor>((cursor) => read(cursor, 10), 25);

    expect(result.rows).toHaveLength(25);
    expect(result.truncated).toBe(true);
    expect(result.rows.map((row) => row.id)).toEqual(expected(rows, filter).slice(0, 25));
  });

  it("keeps later pages correct when a row stops matching the filter mid-walk", async () => {
    const rows = corpus();
    const filter: Filter = { statuses: ["published"] };
    const before = expected(rows, filter);
    let requests = 0;

    const reader = makeReader(() => rows, filter);
    const result = await collectPages<Row, Cursor>(async (cursor) => {
      requests += 1;
      // After the first page, a still-unread row is re-triaged away.
      if (requests === 2) {
        const victim = rows.find((row) => row.id === before[40]);
        if (victim) victim.status = "draft";
      }
      return reader(cursor, 10);
    }, 5_000);

    const ids = result.rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The re-triaged row drops out; nothing else shifts, repeats or disappears.
    expect(ids).toEqual(before.filter((id) => id !== before[40]));
  });
});
