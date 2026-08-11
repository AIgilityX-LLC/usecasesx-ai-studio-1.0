/**
 * Domain validation contract.
 *
 * Every submit/patch path parses through `src/lib/domain/validation.ts` on both
 * client and server, so this suite pins the boundaries users actually hit:
 * blank names, over-long notes, out-of-range score dimensions, empty patches and
 * malformed identifiers. It also asserts that a rejection surfaces the *field*
 * message rather than a raw Zod/Postgres string.
 */
import { describe, expect, it } from "bun:test";
import { DomainError } from "@/lib/domain/errors";
import {
  parseInput,
  portfolioCreateSchema,
  portfolioEntryPatchSchema,
  reportRequestSchema,
  savedUseCasePatchSchema,
  scoreDimensionsSchema,
  slugSchema,
  uuidSchema,
} from "@/lib/domain/validation";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";

function reject(schema: Parameters<typeof parseInput>[0], value: unknown): DomainError {
  try {
    parseInput(schema, value);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    return error as DomainError;
  }
  throw new Error("expected validation to fail");
}

describe("identifiers", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(parseInput(uuidSchema, VALID_UUID)).toBe(VALID_UUID);
    expect(reject(uuidSchema, "42").kind).toBe("validation");
    expect(reject(uuidSchema, null).kind).toBe("validation");
  });

  it("trims slugs and rejects blank or over-long values", () => {
    expect(parseInput(slugSchema, "  invoice-triage ")).toBe("invoice-triage");
    expect(reject(slugSchema, "   ").kind).toBe("validation");
    expect(reject(slugSchema, "x".repeat(161)).kind).toBe("validation");
  });
});

describe("score dimensions", () => {
  const valid = {
    strategicAlignment: 8,
    valuePotential: 7,
    feasibility: 6,
    timeToValue: 5,
    riskManageability: 4,
    governanceReadiness: 3,
  };

  it("accepts whole numbers across the full 0–10 band", () => {
    expect(parseInput(scoreDimensionsSchema, valid)).toEqual(valid);
    expect(
      parseInput(scoreDimensionsSchema, {
        ...valid,
        strategicAlignment: 0,
        valuePotential: 10,
      }).valuePotential,
    ).toBe(10);
  });

  it("rejects out-of-range, fractional and missing dimensions", () => {
    expect(reject(scoreDimensionsSchema, { ...valid, feasibility: 11 }).kind).toBe("validation");
    expect(reject(scoreDimensionsSchema, { ...valid, feasibility: -1 }).kind).toBe("validation");
    expect(reject(scoreDimensionsSchema, { ...valid, feasibility: 6.5 }).kind).toBe("validation");
    const { governanceReadiness: _omit, ...partial } = valid;
    expect(reject(scoreDimensionsSchema, partial).kind).toBe("validation");
  });
});

describe("saved use case patch", () => {
  it("requires at least one field", () => {
    expect(reject(savedUseCasePatchSchema, {}).userMessage).toBe("Nothing to update");
  });

  it("enforces the note length ceiling with a readable message", () => {
    const error = reject(savedUseCasePatchSchema, { note: "x".repeat(2001) });
    expect(error.userMessage).toBe("Note must be under 2000 characters");
  });

  it("rejects a priority outside the taxonomy", () => {
    expect(reject(savedUseCasePatchSchema, { priority: "Urgent" }).kind).toBe("validation");
    expect(parseInput(savedUseCasePatchSchema, { priority: "Strategic" }).priority).toBe(
      "Strategic",
    );
  });
});

describe("portfolio input", () => {
  it("requires a name and a type", () => {
    expect(reject(portfolioCreateSchema, { type: "initiative" }).kind).toBe("validation");
    expect(reject(portfolioCreateSchema, { name: "  ", type: "initiative" }).userMessage).toBe(
      "Portfolio name is required",
    );
  });

  it("rejects an unknown visibility rather than silently widening access", () => {
    expect(
      reject(portfolioCreateSchema, {
        name: "Board view",
        type: "initiative",
        visibility: "public",
      }).kind,
    ).toBe("validation");
  });

  it("accepts a well-formed portfolio and trims copy", () => {
    const parsed = parseInput(portfolioCreateSchema, {
      name: "  FY27 AI portfolio ",
      type: "initiative",
      visibility: "workspace",
      reviewCadence: "quarterly",
    });
    expect(parsed.name).toBe("FY27 AI portfolio");
    expect(parsed.visibility).toBe("workspace");
  });

  it("requires an actual change on an entry patch and bounds the rank", () => {
    expect(reject(portfolioEntryPatchSchema, {}).userMessage).toBe("Nothing to update");
    expect(reject(portfolioEntryPatchSchema, { rank: 10_000 }).kind).toBe("validation");
    expect(parseInput(portfolioEntryPatchSchema, { decision: "approved" }).decision).toBe(
      "approved",
    );
  });

  it("rejects a dependency list of non-uuids", () => {
    expect(reject(portfolioEntryPatchSchema, { dependsOn: ["not-a-uuid"] }).kind).toBe(
      "validation",
    );
    expect(parseInput(portfolioEntryPatchSchema, { dependsOn: [VALID_UUID] }).dependsOn).toEqual([
      VALID_UUID,
    ]);
  });
});

describe("report request", () => {
  it("requires a title and caps the selection size", () => {
    expect(reject(reportRequestSchema, { kind: "board", useCaseSlugs: [] }).kind).toBe(
      "validation",
    );
    expect(
      reject(reportRequestSchema, {
        title: "Board pack",
        kind: "board",
        useCaseSlugs: Array.from({ length: 201 }, (_, i) => `slug-${i}`),
      }).kind,
    ).toBe("validation");
  });

  it("accepts an empty selection so an outline-only export still works", () => {
    const parsed = parseInput(reportRequestSchema, {
      title: "Board pack",
      kind: "board",
      useCaseSlugs: [],
    });
    expect(parsed.useCaseSlugs).toEqual([]);
  });
});
