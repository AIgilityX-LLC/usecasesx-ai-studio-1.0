/**
 * Unit tests for the UseCasesX™ domain layer (run with `bun run test:unit`).
 * These lock in current behaviour for validation, ownership and error mapping.
 */
import { describe, expect, test } from "bun:test";

import {
  DomainError,
  classifyDatabaseError,
  normalizeError,
  toUserMessage,
  unwrapResult,
} from "../../src/lib/domain/errors";
import { assertInWorkspace, assertOwned, requireUserId } from "../../src/lib/domain/ownership";
import {
  parseInput,
  portfolioCreateSchema,
  savedUseCasePatchSchema,
  scoreDimensionsSchema,
} from "../../src/lib/domain/validation";
import { toPortfolioColumns } from "../../src/lib/domain/portfolios.repository";

const UID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("error mapping", () => {
  test("classifies RLS denials as forbidden", () => {
    expect(classifyDatabaseError({ code: "42501" })).toBe("forbidden");
    expect(classifyDatabaseError({ message: "new row violates row-level security policy" })).toBe("forbidden");
  });

  test("classifies unique violations and missing rows", () => {
    expect(classifyDatabaseError({ code: "23505" })).toBe("conflict");
    expect(classifyDatabaseError({ code: "PGRST116" })).toBe("not_found");
  });

  test("never leaks raw database text to the user", () => {
    const message = toUserMessage({ code: "42501", message: 'permission denied for table "portfolios"' });
    expect(message).toBe("You do not have access to this item.");
    expect(message).not.toContain("portfolios");
  });

  test("normalizeError is idempotent", () => {
    const original = new DomainError("not_found");
    expect(normalizeError(original)).toBe(original);
  });

  test("unwrapResult throws not_found for empty data", () => {
    expect(() => unwrapResult({ data: null, error: null })).toThrow(DomainError);
    expect(unwrapResult({ data: [1], error: null })).toEqual([1]);
  });
});

describe("ownership", () => {
  test("requires a signed-in user", () => {
    expect(() => requireUserId(null)).toThrow(DomainError);
    expect(requireUserId(UID)).toBe(UID);
  });

  test("rejects rows owned by another user", () => {
    expect(() => assertOwned({ user_id: OTHER }, UID)).toThrow(DomainError);
    expect(() => assertOwned({ user_id: UID }, UID)).not.toThrow();
    expect(() => assertOwned(null, UID)).toThrow(DomainError);
  });

  test("workspace scoping accepts workspace or organization match", () => {
    expect(() => assertInWorkspace({ workspace_id: "w1" }, { workspaceId: "w1" })).not.toThrow();
    expect(() => assertInWorkspace({ organization_id: "o1" }, { organizationId: "o1" })).not.toThrow();
    expect(() => assertInWorkspace({ workspace_id: "w1" }, { workspaceId: "w2" })).toThrow(DomainError);
    expect(() => assertInWorkspace({ workspace_id: null }, { workspaceId: null })).toThrow(DomainError);
  });
});

describe("validation", () => {
  test("portfolio name is required and trimmed", () => {
    expect(() => parseInput(portfolioCreateSchema, { name: "  ", type: "Custom Portfolio" })).toThrow(DomainError);
    expect(parseInput(portfolioCreateSchema, { name: " Ops ", type: "Custom Portfolio" }).name).toBe("Ops");
  });

  test("saved patch requires at least one field", () => {
    expect(() => parseInput(savedUseCasePatchSchema, {})).toThrow(DomainError);
    expect(parseInput(savedUseCasePatchSchema, { priority: "Strategic" }).priority).toBe("Strategic");
  });

  test("scores stay inside the 0-10 band", () => {
    const valid = {
      strategicAlignment: 5, valuePotential: 5, feasibility: 5,
      timeToValue: 5, riskManageability: 5, governanceReadiness: 5,
    };
    expect(parseInput(scoreDimensionsSchema, valid)).toEqual(valid);
    expect(() => parseInput(scoreDimensionsSchema, { ...valid, feasibility: 11 })).toThrow(DomainError);
  });

  test("validation errors carry a user-safe message", () => {
    try {
      parseInput(portfolioCreateSchema, { name: "", type: "Custom Portfolio" });
    } catch (error) {
      expect((error as DomainError).kind).toBe("validation");
      expect((error as DomainError).userMessage).toBe("Portfolio name is required");
    }
  });
});

describe("portfolio column mapping", () => {
  test("only maps provided fields", () => {
    expect(toPortfolioColumns({ name: "Q3" })).toEqual({ name: "Q3" });
    expect(toPortfolioColumns({})).toEqual({});
  });

  test("maps optional fields to null rather than dropping them", () => {
    expect(toPortfolioColumns({ objective: undefined })).toEqual({});
    expect(toPortfolioColumns({ targetQuarter: "Q4 2026" })).toEqual({ target_quarter: "Q4 2026" });
  });
});
