/**
 * Background guided-story export job.
 *
 * Runs the PDF build off the click handler so the page stays interactive,
 * reports staged progress, retries transient failures with backoff and exposes
 * a manual retry. Each terminal outcome is recorded in the demo activity trail.
 */
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { DEMO_TEMPLATE_VERSION, type DemoScenario } from "@/lib/demo/demo-scenarios";
import { exportDemoStoryPDF, type LineageEntry } from "@/lib/demo/demo-story-export";
import { recordDemoStoryExportFn } from "@/lib/demo/demo-scenarios.functions";

export type StoryExportPhase =
  | "idle"
  | "queued"
  | "collecting"
  | "composing"
  | "rendering"
  | "done"
  | "failed";

export interface StoryExportJob {
  phase: StoryExportPhase;
  progress: number;
  attempt: number;
  error: string | null;
}

const IDLE: StoryExportJob = { phase: "idle", progress: 0, attempt: 0, error: null };

const PHASE_LABEL: Record<StoryExportPhase, string> = {
  idle: "",
  queued: "Queued…",
  collecting: "Collecting template data…",
  composing: "Composing chapters…",
  rendering: "Rendering PDF…",
  done: "Package ready",
  failed: "Export failed",
};

export function storyExportLabel(job: StoryExportJob) {
  return job.phase === "failed" && job.error
    ? `${PHASE_LABEL.failed} — ${job.error}`
    : PHASE_LABEL[job.phase];
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_ATTEMPTS = 3;

export function useDemoStoryExport(lineage: LineageEntry[]) {
  const record = useServerFn(recordDemoStoryExportFn);
  const [jobs, setJobs] = useState<Record<string, StoryExportJob>>({});
  const running = useRef<Set<string>>(new Set());
  const lineageRef = useRef(lineage);
  lineageRef.current = lineage;

  const patch = useCallback((key: string, next: Partial<StoryExportJob>) => {
    setJobs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? IDLE), ...next } }));
  }, []);

  const start = useCallback(
    async (scenario: DemoScenario) => {
      const key = scenario.key;
      if (running.current.has(key)) return;
      running.current.add(key);

      const scoped = lineageRef.current.filter((l) => l.scenario_key === key);
      let lastError = "";

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        patch(key, { phase: "queued", progress: 8, attempt, error: null });
        try {
          await wait(120);
          patch(key, { phase: "collecting", progress: 35 });
          await wait(150);
          patch(key, { phase: "composing", progress: 65 });
          await wait(150);
          patch(key, { phase: "rendering", progress: 88 });

          exportDemoStoryPDF(scenario, scoped);

          patch(key, { phase: "done", progress: 100, error: null });
          void record({
            data: {
              scenarioKey: key,
              scenarioLabel: scenario.label,
              templateVersion: DEMO_TEMPLATE_VERSION,
              lineageCopies: scoped.length,
              status: "exported",
            },
          }).catch(() => undefined);
          running.current.delete(key);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown error";
          if (attempt < MAX_ATTEMPTS) await wait(400 * attempt);
        }
      }

      patch(key, { phase: "failed", progress: 100, error: lastError });
      void record({
        data: {
          scenarioKey: key,
          scenarioLabel: scenario.label,
          templateVersion: DEMO_TEMPLATE_VERSION,
          lineageCopies: scoped.length,
          status: "failed",
          error: lastError.slice(0, 500),
        },
      }).catch(() => undefined);
      running.current.delete(key);
    },
    [patch, record],
  );

  const jobFor = useCallback((key: string) => jobs[key] ?? IDLE, [jobs]);

  return { start, jobFor };
}
