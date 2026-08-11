import { describe, expect, test } from "bun:test";

import {
  LEGAL_DOCUMENTS,
  LEGAL_REVIEW_NOTICE,
  TRANSPARENCY_LINKS,
  legalDocument,
} from "@/lib/legal/legal-content";
import {
  FAQ_CATEGORIES,
  FAQ_ENTRIES,
  GETTING_STARTED_STEPS,
  faqEntries,
  faqJsonLd,
} from "@/lib/legal/help-content";
import { PUBLIC_INDEXABLE_PATHS } from "@/lib/seo";
import { TRANSPARENCY_NAV_TARGETS } from "@/lib/nav-integrity";

describe("legal documents", () => {
  test("every document has a unique path, meta and at least three sections", () => {
    const paths = new Set<string>();
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.path.startsWith("/")).toBe(true);
      expect(paths.has(doc.path)).toBe(false);
      paths.add(doc.path);
      expect(doc.metaTitle.length).toBeLessThan(60);
      expect(doc.metaDescription.length).toBeLessThan(160);
      expect(doc.sections.length).toBeGreaterThanOrEqual(3);
      for (const section of doc.sections) {
        expect((section.body?.length ?? 0) + (section.bullets?.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  test("every document is registered as publicly indexable and nav-checked", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(PUBLIC_INDEXABLE_PATHS as readonly string[]).toContain(doc.path);
      expect(TRANSPARENCY_NAV_TARGETS as readonly string[]).toContain(doc.path);
    }
  });

  test("legalDocument resolves by key and throws on an unknown key", () => {
    expect(legalDocument("privacy").path).toBe("/privacy");
    // @ts-expect-error unknown key must not compile, and must throw at runtime
    expect(() => legalDocument("nope")).toThrow();
  });

  test("the review-pending notice makes no certification or compliance claim", () => {
    const forbidden = ["SOC 2", "ISO 27001", "GDPR compliant", "HIPAA", "PCI"];
    const corpus = [
      LEGAL_REVIEW_NOTICE,
      ...LEGAL_DOCUMENTS.flatMap((doc) =>
        doc.sections.flatMap((s) => [...(s.body ?? []), ...(s.bullets ?? [])]),
      ),
    ]
      .join(" ")
      .toLowerCase();
    for (const claim of forbidden) {
      expect(corpus.includes(`${claim.toLowerCase()} certified`)).toBe(false);
    }
    expect(corpus).toContain("do not claim");
  });
});

describe("help content", () => {
  test("getting started steps are sequential and point at real targets", () => {
    GETTING_STARTED_STEPS.forEach((step, index) => {
      expect(step.step).toBe(index + 1);
      expect(step.to.startsWith("/")).toBe(true);
      expect(step.ctaLabel.length).toBeGreaterThan(0);
    });
  });

  test("every FAQ category has at least two answered questions", () => {
    for (const category of FAQ_CATEGORIES) {
      const entries = faqEntries(category);
      expect(entries.length).toBeGreaterThanOrEqual(2);
      for (const entry of entries) {
        expect(entry.question.endsWith("?")).toBe(true);
        expect(entry.answer.length).toBeGreaterThan(40);
      }
    }
  });

  test("FAQ JSON-LD mirrors the rendered answers", () => {
    const payload = faqJsonLd() as { mainEntity: { name: string }[] };
    expect(payload.mainEntity).toHaveLength(FAQ_ENTRIES.length);
    expect(payload.mainEntity[0]?.name).toBe(FAQ_ENTRIES[0]!.question);
  });

  test("transparency links cover documents plus help surfaces without duplicates", () => {
    const targets = TRANSPARENCY_LINKS.map((link) => link.to);
    expect(new Set(targets).size).toBe(targets.length);
    for (const path of ["/getting-started", "/faq", "/support"]) {
      expect(targets).toContain(path);
    }
  });
});
