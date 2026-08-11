/**
 * Repository search relevance.
 *
 * The database decides which rows match; this module decides the order the user
 * sees. The properties pinned here are the ones a browser notices: title hits
 * beat body hits, rows matching the whole query beat rows matching one word,
 * ties resolve deterministically, and keyword stuffing cannot buy the top slot.
 */
import { describe, expect, it } from "bun:test";
import { rankByRelevance, relevanceScore, searchTerms } from "@/lib/use-cases.search";
import { searchCorpus, repositoryRow } from "../fixtures/deterministic";

describe("searchTerms", () => {
  it("lowercases, de-duplicates and drops single characters", () => {
    expect(searchTerms("Invoice  invoice a Fraud")).toEqual(["invoice", "fraud"]);
  });

  it("keeps technical tokens intact", () => {
    expect(searchTerms("GPT-4 C#.NET")).toEqual(["gpt-4", "c#.net"]);
  });

  it("caps the term count so a pasted paragraph cannot blow up ranking", () => {
    const raw = Array.from({ length: 30 }, (_, i) => `term${i}`).join(" ");
    expect(searchTerms(raw).length).toBe(8);
  });

  it("returns nothing for punctuation-only input", () => {
    expect(searchTerms("  ,,, ")).toEqual([]);
  });
});

describe("relevanceScore", () => {
  it("is zero when there are no terms", () => {
    expect(relevanceScore(repositoryRow(), [], "")).toBe(0);
  });

  it("weights a title hit above the same word in the body", () => {
    const inTitle = repositoryRow({ title: "Invoice triage", business_problem: "Nothing here." });
    const inBody = repositoryRow({
      title: "Generic assistant",
      business_problem: "Invoice backlog.",
    });
    expect(relevanceScore(inTitle, ["invoice"], "invoice")).toBeGreaterThan(
      relevanceScore(inBody, ["invoice"], "invoice"),
    );
  });

  it("rewards covering every term over matching just one", () => {
    const both = repositoryRow({ title: "Invoice fraud detection" });
    const one = repositoryRow({ title: "Invoice capture" });
    expect(relevanceScore(both, ["invoice", "fraud"], "invoice fraud")).toBeGreaterThan(
      relevanceScore(one, ["invoice", "fraud"], "invoice fraud"),
    );
  });

  it("applies diminishing returns so repetition cannot beat a title match", () => {
    const stuffed = repositoryRow({
      title: "Generic assistant",
      business_problem: Array.from({ length: 40 }, () => "invoice").join(" "),
    });
    const honest = repositoryRow({ title: "Invoice fraud detection" });
    expect(relevanceScore(honest, ["invoice"], "invoice")).toBeGreaterThan(
      relevanceScore(stuffed, ["invoice"], "invoice"),
    );
  });

  it("treats an exact title phrase as the strongest signal", () => {
    const exact = repositoryRow({ title: "Invoice fraud detection" });
    const scattered = repositoryRow({ title: "Fraud review and invoice archive" });
    expect(relevanceScore(exact, ["invoice", "fraud"], "invoice fraud")).toBeGreaterThan(
      relevanceScore(scattered, ["invoice", "fraud"], "invoice fraud"),
    );
  });

  it("does not crash on rows with missing or non-string fields", () => {
    const score = relevanceScore(
      { title: null, summary: undefined, impact_score: "n/a" },
      ["invoice"],
      "invoice",
    );
    expect(Number.isFinite(score)).toBe(true);
  });
});

describe("rankByRelevance", () => {
  it("orders the corpus by intent, not by editorial impact alone", () => {
    const ranked = rankByRelevance(searchCorpus(), "invoice fraud", searchTerms("invoice fraud"));
    expect(ranked[0]?.slug).toBe("invoice-fraud-detection");
    // The highest-impact row is irrelevant to this query and must sink.
    expect(ranked.at(-1)?.slug).toBe("citizen-permit-triage");
  });

  it("preserves input order for equally scored rows", () => {
    const rows = [
      repositoryRow({ slug: "first" }),
      repositoryRow({ slug: "second" }),
      repositoryRow({ slug: "third" }),
    ];
    expect(rankByRelevance(rows, "unmatched", ["unmatched"]).map((r) => r.slug)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("never adds or drops rows", () => {
    const rows = searchCorpus();
    const ranked = rankByRelevance(rows, "invoice", searchTerms("invoice"));
    expect(ranked.length).toBe(rows.length);
    expect(new Set(ranked.map((r) => r.slug)).size).toBe(rows.length);
  });

  it("is stable across repeated runs", () => {
    const a = rankByRelevance(searchCorpus(), "invoice", searchTerms("invoice")).map((r) => r.slug);
    const b = rankByRelevance(searchCorpus(), "invoice", searchTerms("invoice")).map((r) => r.slug);
    expect(a).toEqual(b);
  });
});
