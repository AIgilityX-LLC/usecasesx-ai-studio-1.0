/**
 * Browser P0/P1 suite runs (pure).
 *
 * The signed-in harness answers what a session can see; the browser suite
 * answers what a real participant can do in a real browser. Its result is
 * recorded so the readiness browser gate reads a measurement instead of
 * "unknown". Nothing here touches a client or a secret.
 */

export const BROWSER_SUITE_ID = "p0-p1";

export type BrowserSpecResult = {
  /** Spec file, e.g. "tests/launch-access.e2e.ts". */
  spec: string;
  title: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  durationMs: number;
  /** First line of the failure, when there is one. */
  error?: string | null;
};

export type BrowserSuiteRun = {
  id: string;
  cohort: string;
  suite: string;
  actorId: string | null;
  actorEmail: string | null;
  /** The participant account the suite signed in as. */
  participantEmail: string | null;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  verdict: BrowserVerdict;
  failingSpecs: string[];
  specResults: BrowserSpecResult[];
  notes: string | null;
  createdAt: string;
};

export type BrowserVerdict = "pass" | "attention" | "fail" | "unknown";

/** A run with any failure is a failure. Skips alone are an attention item. */
export function browserVerdict(input: {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}): BrowserVerdict {
  if (input.total === 0) return "unknown";
  if (input.failed > 0) return "fail";
  if (input.skipped > 0) return "attention";
  return "pass";
}

export function describeBrowserRun(run: BrowserSuiteRun | null): string {
  if (!run) {
    return "No browser P0/P1 suite run has been recorded for this cohort yet.";
  }
  const who = run.participantEmail ? ` as ${run.participantEmail}` : "";
  const failing =
    run.failingSpecs.length > 0 ? ` Failing: ${run.failingSpecs.slice(0, 5).join(", ")}.` : "";
  return (
    `${run.passed}/${run.total} browser specs passed${who} · ` +
    `${run.failed} failed · ${run.skipped} skipped · ${Math.round(run.durationMs / 1000)}s.${failing}`
  );
}

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function browserRunToCsv(run: BrowserSuiteRun): string {
  const header = ["Spec", "Title", "Status", "Duration ms", "Error"];
  const body = run.specResults.map((result) => [
    result.spec,
    result.title,
    result.status,
    result.durationMs,
    result.error ?? "",
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * Flattens a Playwright JSON report into spec results. The suite runs outside
 * the app runtime (a Worker cannot drive a browser), so its report is the
 * measurement we import rather than fabricate.
 */
export function parsePlaywrightReport(report: unknown): {
  results: BrowserSpecResult[];
  durationMs: number;
} {
  const results: BrowserSpecResult[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (suite: any, file: string) => {
    const spec = String(suite?.file ?? file ?? "unknown");
    for (const entry of suite?.specs ?? []) {
      for (const test of entry?.tests ?? []) {
        const last = (test?.results ?? []).at(-1);
        const status = String(last?.status ?? test?.status ?? "skipped");
        results.push({
          spec,
          title: String(entry?.title ?? "untitled"),
          status:
            status === "passed" || status === "failed" || status === "timedOut"
              ? (status as BrowserSpecResult["status"])
              : "skipped",
          durationMs: Number(last?.duration ?? 0),
          error: last?.error?.message
            ? String(last.error.message).split("\n")[0]!.slice(0, 2000)
            : null,
        });
      }
    }
    for (const child of suite?.suites ?? []) walk(child, spec);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const suite of (report as any)?.suites ?? []) walk(suite, "unknown");
  const durationMs =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Number((report as any)?.stats?.duration ?? 0) ||
    results.reduce((sum, result) => sum + result.durationMs, 0);
  return { results, durationMs };
}
