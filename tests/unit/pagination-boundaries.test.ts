/**
 * Keyset boundary tests for the bounded list readers.
 *
 * These simulate a PostgREST-backed table (descending sort column, ascending
 * unique tiebreaker) and page through it exactly the way
 * `listSavedPageForUser` / `listPortfoliosPageForUser` do. The properties under
 * test are the ones a user notices when keyset paging is wrong:
 *
 * - no row appears twice across pages
 * - no row is skipped, including across ties on the sort column
 * - rows deleted or inserted mid-walk never corrupt the remaining pages
 * - the "showing N of M" line matches what was actually loaded
 */
import { describe, expect, it } from "bun:test";
import {
  buildListMeta,
  buildPage,
  collectPages,
  describeListMeta,
  type Page,
} from "@/lib/domain/pagination";

interface Row {
  id: string;
  sortAt: string;
}
type Cursor = { sortAt: string; id: string };

/** Same comparator the database uses: sortAt DESC, id ASC. */
function compare(a: Row, b: Row): number {
  if (a.sortAt !== b.sortAt) return a.sortAt < b.sortAt ? 1 : -1;
  return a.id < b.id ? -1 : 1;
}

/** True when `row` sits strictly after `cursor` in keyset order. */
function afterCursor(row: Row, cursor: Cursor): boolean {
  if (row.sortAt < cursor.sortAt) return true;
  return row.sortAt === cursor.sortAt && row.id > cursor.id;
}

/** In-memory stand-in for one keyset page request against a live table. */
function makeTable(rows: Row[]) {
  const table = [...rows];
  return {
    rows: table,
    fetchPage(cursor: Cursor | null, pageSize: number): Page<Row, Cursor> {
      const sorted = [...table].sort(compare);
      const visible = cursor ? sorted.filter((row) => afterCursor(row, cursor)) : sorted;
      // Over-fetch by one, exactly like the repositories do.
      const fetched = visible.slice(0, pageSize + 1);
      return buildPage(fetched, pageSize, (row) => ({ sortAt: row.sortAt, id: row.id }));
    },
  };
}

/** Dataset with heavy ties on the sort column — the classic offset-paging trap. */
function tiedDataset(count: number, distinctTimestamps: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${String(i).padStart(4, "0")}`,
    sortAt: `2026-01-${String((i % distinctTimestamps) + 1).padStart(2, "0")}T00:00:00Z`,
  }));
}

describe("keyset paging boundaries", () => {
  it("returns every row exactly once when the page size divides the dataset", async () => {
    const table = makeTable(tiedDataset(100, 5));
    const result = await collectPages<Row, Cursor>(
      (cursor) => Promise.resolve(table.fetchPage(cursor, 25)),
      1000,
    );

    const ids = result.rows.map((row) => row.id);
    expect(ids.length).toBe(100);
    expect(new Set(ids).size).toBe(100);
    expect(result.truncated).toBe(false);
    expect(result.requests).toBe(4); // over-fetch probe means no extra empty request
  });

  it("returns every row exactly once when the last page is partial", async () => {
    const table = makeTable(tiedDataset(97, 7));
    const result = await collectPages<Row, Cursor>(
      (cursor) => Promise.resolve(table.fetchPage(cursor, 20)),
      1000,
    );

    const ids = result.rows.map((row) => row.id);
    expect(ids.length).toBe(97);
    expect(new Set(ids).size).toBe(97);
    expect(ids).toEqual([...table.rows].sort(compare).map((row) => row.id));
  });

  it("does not skip or duplicate rows across ties on the sort column", async () => {
    // Every row shares one timestamp: correctness depends entirely on the tiebreaker.
    const table = makeTable(
      Array.from({ length: 61 }, (_, i) => ({
        id: `row-${String(i).padStart(3, "0")}`,
        sortAt: "2026-02-01T00:00:00Z",
      })),
    );
    const result = await collectPages<Row, Cursor>(
      (cursor) => Promise.resolve(table.fetchPage(cursor, 10)),
      1000,
    );

    expect(result.rows.map((row) => row.id)).toEqual(
      [...table.rows].sort(compare).map((row) => row.id),
    );
  });

  it("never revisits a page boundary when rows are deleted mid-walk", async () => {
    const table = makeTable(tiedDataset(60, 3));
    const seen: string[] = [];
    let page = 0;

    await collectPages<Row, Cursor>((cursor) => {
      page += 1;
      if (page === 3) {
        // Delete an already-returned row: keyset paging must not shift later pages.
        const victim = seen[0]!;
        const index = table.rows.findIndex((row) => row.id === victim);
        if (index >= 0) table.rows.splice(index, 1);
      }
      const result = table.fetchPage(cursor, 10);
      for (const row of result.rows) seen.push(row.id);
      return Promise.resolve(result);
    }, 1000);

    expect(new Set(seen).size).toBe(seen.length); // no duplicates
    // Everything still in the table after the delete was seen.
    for (const row of table.rows) expect(seen).toContain(row.id);
  });

  it("does not duplicate rows when a newer row is inserted mid-walk", async () => {
    const table = makeTable(tiedDataset(40, 4));
    let page = 0;

    const result = await collectPages<Row, Cursor>((cursor) => {
      page += 1;
      if (page === 2) {
        // A newer row sorts before the cursor and is legitimately missed by this
        // walk — what must not happen is a duplicate or a shifted page.
        table.rows.push({ id: "row-new", sortAt: "2026-12-31T00:00:00Z" });
      }
      return Promise.resolve(table.fetchPage(cursor, 10));
    }, 1000);

    const ids = result.rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("row-new");
  });

  it("stops at the cap and reports truncation instead of walking forever", async () => {
    const table = makeTable(tiedDataset(1200, 30));
    const result = await collectPages<Row, Cursor>(
      (cursor) => Promise.resolve(table.fetchPage(cursor, 50)),
      500,
    );

    expect(result.rows.length).toBe(500);
    expect(result.truncated).toBe(true);
    expect(result.requests).toBeLessThanOrEqual(11);
    expect(new Set(result.rows.map((row) => row.id)).size).toBe(500);
  });

  it("loads a capped prefix that matches the database ordering", async () => {
    const table = makeTable(tiedDataset(300, 10));
    const result = await collectPages<Row, Cursor>(
      (cursor) => Promise.resolve(table.fetchPage(cursor, 40)),
      200,
    );

    const expected = [...table.rows].sort(compare).slice(0, 200).map((row) => row.id);
    expect(result.rows.map((row) => row.id)).toEqual(expected);
  });
});

describe("list meta reflects the walk", () => {
  it("says nothing when the whole list is on screen", async () => {
    const table = makeTable(tiedDataset(12, 3));
    const result = await collectPages<Row, Cursor>(
      (cursor) => Promise.resolve(table.fetchPage(cursor, 50)),
      500,
    );
    const meta = buildListMeta({
      loaded: result.rows.length,
      total: table.rows.length,
      cap: 500,
      walkTruncated: result.truncated,
    });

    expect(meta.truncated).toBe(false);
    expect(describeListMeta(meta, "saved use cases")).toBeNull();
  });

  it("states the cap and the true total when the walk is truncated", async () => {
    const table = makeTable(tiedDataset(1240, 40));
    const result = await collectPages<Row, Cursor>(
      (cursor) => Promise.resolve(table.fetchPage(cursor, 50)),
      500,
    );
    const meta = buildListMeta({
      loaded: result.rows.length,
      total: table.rows.length,
      cap: 500,
      walkTruncated: result.truncated,
    });

    expect(describeListMeta(meta, "saved use cases")).toBe(
      "Showing the first 500 of 1240 saved use cases. This view is capped at 500 to keep it fast.",
    );
  });

  it("still warns when the count query fails", () => {
    const meta = buildListMeta({ loaded: 200, total: null, cap: 200, walkTruncated: true });
    expect(describeListMeta(meta, "portfolios")).toBe(
      "Showing the first 200 portfolios. This view is capped at 200 to keep it fast.",
    );
  });

  it("reports a partial load when the count exceeds the rows returned", () => {
    const meta = buildListMeta({ loaded: 180, total: 190, cap: 200, walkTruncated: false });
    expect(meta.truncated).toBe(true);
    expect(describeListMeta(meta, "portfolios")).toContain("Showing the first 180 of 190");
  });
});
