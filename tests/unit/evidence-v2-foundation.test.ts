/**
 * V2-05 evidence model + upload path contracts.
 */
import { describe, expect, it } from "bun:test";
import {
  EvidenceCreateInput,
  evidenceAuditMetadata,
  evidenceIndicator,
  evidenceSetIndicators,
  STALE_AFTER_DAYS,
  type EvidenceItem,
} from "@/lib/evidence/model";
import {
  evidenceItemsObjectPath,
  parseEvidenceItemsPath,
  validateUpload,
} from "@/lib/storage/storage-policy";

const baseItem = (over: Partial<EvidenceItem> = {}): EvidenceItem => ({
  id: "11111111-1111-1111-1111-111111111111",
  organizationId: null,
  workspaceId: "22222222-2222-2222-2222-222222222222",
  subjectType: "use_case",
  subjectId: "33333333-3333-3333-3333-333333333333",
  recordVersionId: null,
  kind: "link",
  label: "Baseline memo",
  url: "https://example.gov/memo",
  note: null,
  storagePath: null,
  mimeType: null,
  sizeBytes: null,
  source: "Finance",
  ownerUserId: null,
  ownerLabel: null,
  collectedAt: "2026-01-01",
  reviewedAt: "2026-01-15",
  confidentiality: "internal",
  applicableFields: ["value_contract"],
  integrityHash: null,
  retentionLabel: "7y",
  status: "active",
  statusNote: null,
  createdBy: "44444444-4444-4444-4444-444444444444",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
  ...over,
});

describe("evidence create validation", () => {
  it("accepts a link with https URL", () => {
    const parsed = EvidenceCreateInput.parse({
      workspaceId: "22222222-2222-2222-2222-222222222222",
      subjectType: "use_case",
      subjectId: "33333333-3333-3333-3333-333333333333",
      kind: "link",
      label: "Link",
      url: "https://example.com/a",
      confidentiality: "internal",
      applicableFields: [],
    });
    expect(parsed.kind).toBe("link");
  });

  it("rejects file evidence without storage path", () => {
    expect(() =>
      EvidenceCreateInput.parse({
        workspaceId: "22222222-2222-2222-2222-222222222222",
        subjectType: "use_case",
        subjectId: "33333333-3333-3333-3333-333333333333",
        kind: "file",
        label: "Doc",
        confidentiality: "internal",
        applicableFields: [],
      }),
    ).toThrow();
  });
});

describe("stale / missing / conflict indicators", () => {
  it("flags conflict and missing explicitly", () => {
    expect(evidenceIndicator(baseItem({ status: "conflict" })).status).toBe("conflict");
    expect(evidenceIndicator(baseItem({ status: "missing" })).tone).toBe("warning");
  });

  it("derives stale from age when status is active", () => {
    const old = baseItem({
      collectedAt: "2020-01-01",
      reviewedAt: null,
      createdAt: "2020-01-01T00:00:00.000Z",
    });
    const ind = evidenceIndicator(old, new Date("2026-09-23"));
    expect(ind.status).toBe("stale");
    expect(ind.reason).toContain(String(STALE_AFTER_DAYS));
  });

  it("summarises a set", () => {
    const summary = evidenceSetIndicators([
      baseItem({ id: "a", status: "active", reviewedAt: "2026-09-01" }),
      baseItem({ id: "b", status: "conflict", label: "Clash" }),
    ]);
    expect(summary.conflict).toBe(1);
    expect(summary.warnings[0]).toContain("Clash");
  });
});

describe("audit metadata redaction shape", () => {
  it("never includes note body or url", () => {
    const meta = evidenceAuditMetadata({
      ...baseItem({ note: "SECRET BODY", url: "https://secret.example/path?token=1" }),
      note: "SECRET BODY",
    } as EvidenceItem);
    expect(JSON.stringify(meta)).not.toContain("SECRET");
    expect(meta).not.toHaveProperty("url");
    expect(meta).not.toHaveProperty("note");
    expect(meta.hasIntegrityHash).toBe(false);
  });
});

describe("evidence-items upload paths", () => {
  it("builds and parses workspace-scoped paths", () => {
    const ws = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const uc = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const path = evidenceItemsObjectPath(ws, "use_case", uc, "Report.PDF");
    expect(path.startsWith(`${ws}/use_case/${uc}/`)).toBe(true);
    const parsed = parseEvidenceItemsPath(path);
    expect(parsed?.workspaceId).toBe(ws);
    expect(parsed?.subjectType).toBe("use_case");
    expect(parsed?.subjectId).toBe(uc);
  });

  it("rejects path traversal", () => {
    expect(parseEvidenceItemsPath("../x/y/z")).toBeNull();
  });

  it("enforces evidence-items MIME policy", () => {
    expect(
      validateUpload("evidence-items", {
        name: "a.pdf",
        size: 100,
        type: "application/pdf",
      }).allowed,
    ).toBe(true);
    expect(
      validateUpload("evidence-items", {
        name: "a.exe",
        size: 100,
        type: "application/octet-stream",
      }).allowed,
    ).toBe(false);
  });
});
