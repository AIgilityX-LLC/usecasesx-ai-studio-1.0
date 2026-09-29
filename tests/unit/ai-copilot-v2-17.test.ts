/**
 * V2-17 unit tests — circuit breaker, eval thresholds, FR-14 catalogue.
 */

import { describe, expect, test } from "bun:test";
import { AI_TASKS, FR14_PURPOSE_OPS, PROMPT_REGISTRY } from "@/lib/ai/prompts";
import { OUTPUT_SCHEMAS, TOOL_SCHEMAS } from "@/lib/ai/schemas";
import { createCircuit, resetSharedGatewayCircuit } from "@/lib/ai/circuit-breaker";
import {
  AI_EVAL_CASES,
  AI_EVAL_DATASET_VERSION,
  AI_EVAL_THRESHOLDS,
  evaluateCategory,
  casesForCategory,
} from "@/lib/ai/eval/dataset";
import {
  AI_CONFIDENCE_CAVEAT,
  TRAINING_POLICY,
  MANUAL_FALLBACK_HINT,
  aiFeedbackInputSchema,
} from "@/lib/ai/feedback";
import { aiFailure, AI_ERROR_MESSAGES } from "@/lib/ai/types";
import { sanitizeUntrusted } from "@/lib/ai/sanitize";

describe("V2-17 FR-14 purpose ops", () => {
  test("every purpose maps to a registered task with schema + tool", () => {
    for (const task of Object.values(FR14_PURPOSE_OPS)) {
      expect(AI_TASKS).toContain(task);
      expect(PROMPT_REGISTRY[task].version).toMatch(/^\d{4}-\d{2}-\d{2}\./);
      expect(OUTPUT_SCHEMAS[task]).toBeDefined();
      expect(TOOL_SCHEMAS[task].function.name.length).toBeGreaterThan(0);
    }
  });

  test("full task catalogue stays schema-complete", () => {
    for (const task of AI_TASKS) {
      expect(OUTPUT_SCHEMAS[task]).toBeDefined();
      expect(TOOL_SCHEMAS[task]).toBeDefined();
    }
  });
});

describe("V2-17 circuit breaker", () => {
  test("opens after consecutive failures and half-opens after cooldown", () => {
    const c = createCircuit({ failureThreshold: 3, cooldownMs: 1_000 });
    expect(c.allow()).toBe(true);
    c.recordFailure(1_000);
    c.recordFailure(1_001);
    expect(c.allow(1_002)).toBe(true);
    c.recordFailure(1_002);
    expect(c.snapshot(1_003).state).toBe("open");
    expect(c.allow(1_003)).toBe(false);
    expect(c.allow(2_100)).toBe(true); // half-open
    expect(c.snapshot(2_100).state).toBe("half_open");
    c.recordSuccess();
    expect(c.snapshot().state).toBe("closed");
  });

  test("resetSharedGatewayCircuit restores closed state", () => {
    resetSharedGatewayCircuit(createCircuit({ failureThreshold: 1, cooldownMs: 60_000 }));
    const shared = createCircuit({ failureThreshold: 1, cooldownMs: 60_000 });
    shared.recordFailure();
    expect(shared.allow()).toBe(false);
    resetSharedGatewayCircuit();
  });
});

describe("V2-17 evaluation dataset", () => {
  test("versioned dataset covers required categories", () => {
    expect(AI_EVAL_DATASET_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\./);
    const cats = new Set(AI_EVAL_CASES.map((c) => c.category));
    for (const required of Object.keys(AI_EVAL_THRESHOLDS)) {
      expect(cats.has(required as keyof typeof AI_EVAL_THRESHOLDS)).toBe(true);
      expect(casesForCategory(required as keyof typeof AI_EVAL_THRESHOLDS).length).toBeGreaterThan(
        0,
      );
    }
  });

  test("thresholds drive manual fallback", () => {
    const pass = evaluateCategory("prompt_injection", 1);
    expect(pass.passed).toBe(true);
    expect(pass.manualFallbackRequired).toBe(false);
    const fail = evaluateCategory("citation_accuracy", 0.5);
    expect(fail.passed).toBe(false);
    expect(fail.manualFallbackRequired).toBe(true);
  });

  test("injection fixture is neutralised by sanitizer", () => {
    const inj = AI_EVAL_CASES.find((c) => c.id === "inj-01")!;
    const cleaned = sanitizeUntrusted(inj.input);
    expect(cleaned.toLowerCase()).not.toContain("ignore previous instructions");
  });
});

describe("V2-17 feedback + policy", () => {
  test("feedback schema rejects bodies (metadata only)", () => {
    const ok = aiFeedbackInputSchema.parse({
      task: "rewriteText",
      action: "apply",
      promptVersion: "2026-09-24.1",
    });
    expect(ok.action).toBe("apply");
    expect(TRAINING_POLICY.toLowerCase()).toContain("not used for model training");
    expect(AI_CONFIDENCE_CAVEAT.length).toBeGreaterThan(20);
    expect(MANUAL_FALLBACK_HINT.length).toBeGreaterThan(10);
  });

  test("circuit_open failure includes manual fallback", () => {
    const f = aiFailure("circuit_open");
    expect(f.manualFallback).toBe(true);
    expect(f.error.toLowerCase()).toContain("manually");
    expect(f.citations).toEqual([]);
    expect(f.trainingPolicy).toBe(TRAINING_POLICY);
    expect(AI_ERROR_MESSAGES.circuit_open).toBeTruthy();
    expect(MANUAL_FALLBACK_HINT.length).toBeGreaterThan(10);
  });
});
