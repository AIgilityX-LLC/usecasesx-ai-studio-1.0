/**
 * Storage policy unit tests — MIME allowlist, size caps, signed URL TTLs and
 * evidence path parsing. No network, no database.
 */

import { describe, expect, it } from "bun:test";

import {
  BUCKET_POLICIES,
  STORAGE_BUCKETS,
  acceptAttribute,
  extensionOf,
  parseEvidencePath,
  safeObjectName,
  signedUrlTtl,
  validateUpload,
} from "../../src/lib/storage/storage-policy";

const uuid = "11111111-2222-3333-4444-555555555555";

describe("bucket policies", () => {
  it("keeps every signed URL short-lived", () => {
    for (const bucket of STORAGE_BUCKETS) {
      expect(signedUrlTtl(bucket)).toBeGreaterThan(0);
      // Nothing may be valid for longer than five minutes.
      expect(signedUrlTtl(bucket)).toBeLessThanOrEqual(300);
    }
  });

  it("never allows a wildcard or octet-stream MIME type", () => {
    for (const bucket of STORAGE_BUCKETS) {
      for (const mime of BUCKET_POLICIES[bucket].mimeTypes) {
        expect(mime).not.toContain("*");
        expect(mime).not.toBe("application/octet-stream");
      }
    }
  });

  it("derives the file input accept attribute from the policy", () => {
    expect(acceptAttribute("avatars")).toBe(BUCKET_POLICIES.avatars.mimeTypes.join(","));
  });
});

describe("upload validation", () => {
  it("accepts a permitted evidence document", () => {
    expect(
      validateUpload("benefit-evidence", { name: "proof.pdf", size: 1024, type: "application/pdf" })
        .allowed,
    ).toBe(true);
  });

  it("rejects an oversized file", () => {
    const decision = validateUpload("benefit-evidence", {
      name: "proof.pdf",
      size: BUCKET_POLICIES["benefit-evidence"].maxBytes + 1,
      type: "application/pdf",
    });
    expect(decision.allowed).toBe(false);
  });

  it("rejects a disallowed MIME type", () => {
    expect(
      validateUpload("benefit-evidence", {
        name: "payload.exe",
        size: 10,
        type: "application/x-msdownload",
      }).allowed,
    ).toBe(false);
  });

  it("rejects a MIME type spoofed with a mismatched extension", () => {
    expect(
      validateUpload("benefit-evidence", { name: "payload.svg", size: 10, type: "image/png" })
        .allowed,
    ).toBe(false);
  });

  it("rejects an empty file and a missing MIME type", () => {
    expect(validateUpload("avatars", { name: "a.png", size: 0, type: "image/png" }).allowed).toBe(
      false,
    );
    expect(validateUpload("avatars", { name: "a.png", size: 10, type: "" }).allowed).toBe(false);
  });

  it("keeps avatars to images only", () => {
    expect(
      validateUpload("avatars", { name: "x.pdf", size: 10, type: "application/pdf" }).allowed,
    ).toBe(false);
    expect(validateUpload("avatars", { name: "x.png", size: 10, type: "image/png" }).allowed).toBe(
      true,
    );
  });
});

describe("object names", () => {
  it("strips traversal and unsafe characters", () => {
    expect(safeObjectName("../../etc/passwd")).not.toContain("..");
    expect(safeObjectName("a b/c;d.pdf")).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it("reads extensions case-insensitively", () => {
    expect(extensionOf("Report.PDF")).toBe("pdf");
    expect(extensionOf("noextension")).toBe("");
  });
});

describe("evidence path parsing", () => {
  it("accepts the canonical shape", () => {
    expect(parseEvidencePath(`${uuid}/${uuid}/file.pdf`)).toEqual({
      userId: uuid,
      useCaseId: uuid,
      file: "file.pdf",
    });
  });

  it("rejects traversal, absolute paths and wrong shapes", () => {
    expect(parseEvidencePath(`${uuid}/../${uuid}/f.pdf`)).toBeNull();
    expect(parseEvidencePath(`/${uuid}/${uuid}/f.pdf`)).toBeNull();
    expect(parseEvidencePath(`${uuid}/f.pdf`)).toBeNull();
    expect(parseEvidencePath(`not-a-uuid/${uuid}/f.pdf`)).toBeNull();
  });
});
