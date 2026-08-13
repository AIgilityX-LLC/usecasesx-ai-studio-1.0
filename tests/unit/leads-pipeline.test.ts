/**
 * Unit tests for the lead pipeline model: channel mapping, email deduping,
 * filtering, conversion counts and CSV export safety.
 */
import { describe, expect, test } from "bun:test";

import {
  campaignLabel,
  conversionCounts,
  dedupeByEmail,
  filterLeads,
  leadChannel,
  leadsToCsv,
  normalizeLeadStatus,
  type LeadRecord,
} from "@/lib/leads/leads.model";

function lead(overrides: Partial<LeadRecord> & { id: string; email: string }): LeadRecord {
  return {
    reference_id: `UCX-${overrides.id.slice(0, 8).toUpperCase()}`,
    full_name: "Test Person",
    company: "Gov Agency",
    country: "SE",
    interest_area: null,
    cta: "founding-member",
    source_page: "/",
    lead_status: "new",
    waitlist_status: "pending",
    eligible: true,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer_host: null,
    created_at: "2026-08-01T10:00:00.000Z",
    ...overrides,
  } as LeadRecord;
}

describe("leadChannel", () => {
  test("maps waitlist and advisor CTAs", () => {
    expect(leadChannel("founding-member")).toBe("other");
    expect(leadChannel("waitlist")).toBe("waitlist");
    expect(leadChannel("lead_free-pro")).toBe("waitlist");
    expect(leadChannel("ai-strategy-session")).toBe("advisor");
    expect(leadChannel(null)).toBe("other");
  });
});

describe("normalizeLeadStatus", () => {
  test("falls back to new for unknown values", () => {
    expect(normalizeLeadStatus("converted")).toBe("converted");
    expect(normalizeLeadStatus("PENDING")).toBe("new");
    expect(normalizeLeadStatus(null)).toBe("new");
  });
});

describe("dedupeByEmail", () => {
  const rows = [
    lead({
      id: "a",
      email: "exec@gov.se",
      created_at: "2026-08-01T10:00:00.000Z",
      lead_status: "converted",
    }),
    lead({
      id: "b",
      email: "EXEC@gov.se",
      created_at: "2026-08-03T10:00:00.000Z",
      cta: "ai-strategy-session",
    }),
    lead({ id: "c", email: "other@gov.se" }),
  ];

  test("collapses repeat work emails, keeping the best status", () => {
    const out = dedupeByEmail(rows);
    expect(out).toHaveLength(2);
    const merged = out.find((l) => l.email.toLowerCase() === "exec@gov.se")!;
    expect(merged.id).toBe("b");
    expect(merged.submissions).toBe(2);
    expect(merged.lead_status).toBe("converted");
    expect(merged.duplicateIds).toEqual(["a"]);
    expect(merged.channels.sort()).toEqual(["advisor", "other"]);
  });
});

describe("filterLeads", () => {
  const rows = [
    lead({ id: "a", email: "one@gov.se", cta: "ai-strategy-session", utm_campaign: "launch" }),
    lead({ id: "b", email: "two@gov.se", cta: "waitlist", lead_status: "converted" }),
  ];

  test("filters by channel, status, campaign and free-text query", () => {
    expect(filterLeads(rows, { channel: "advisor" }).map((l) => l.id)).toEqual(["a"]);
    expect(filterLeads(rows, { status: "converted" }).map((l) => l.id)).toEqual(["b"]);
    expect(filterLeads(rows, { campaign: "launch" }).map((l) => l.id)).toEqual(["a"]);
    expect(filterLeads(rows, { query: "two@" }).map((l) => l.id)).toEqual(["b"]);
    expect(filterLeads(rows, { channel: "all", status: "all" })).toHaveLength(2);
  });
});

describe("conversionCounts", () => {
  test("reports totals, unique emails and conversion rate", () => {
    const counts = conversionCounts([
      lead({ id: "a", email: "one@gov.se", cta: "waitlist" }),
      lead({ id: "b", email: "ONE@gov.se", cta: "waitlist", lead_status: "converted" }),
      lead({ id: "c", email: "two@gov.se", cta: "advisor", utm_campaign: "launch" }),
    ]);
    expect(counts.total).toBe(3);
    expect(counts.uniqueEmails).toBe(2);
    expect(counts.byStatus.converted).toBe(1);
    expect(counts.byChannel.waitlist).toBe(2);
    expect(counts.conversionRate).toBeCloseTo(1 / 3, 5);
    expect(counts.byCampaign[0]!.campaign).toBe("direct");
  });
});

describe("campaignLabel", () => {
  test("prefers campaign, then source, then referrer, then direct", () => {
    expect(campaignLabel(lead({ id: "a", email: "a@b.se", utm_campaign: "launch" }))).toBe(
      "launch",
    );
    expect(campaignLabel(lead({ id: "a", email: "a@b.se", utm_source: "linkedin" }))).toBe(
      "linkedin",
    );
    expect(campaignLabel(lead({ id: "a", email: "a@b.se", referrer_host: "news.se" }))).toBe(
      "news.se",
    );
    expect(campaignLabel(lead({ id: "a", email: "a@b.se" }))).toBe("direct");
  });
});

describe("leadsToCsv", () => {
  test("includes a header row and neutralizes formula injection", () => {
    const csv = leadsToCsv([lead({ id: "a", email: "a@b.se", full_name: "=cmd()" })]);
    const [header, row] = csv.split("\n");
    expect(header).toContain("reference_id");
    expect(row).toContain('"\'=cmd()"');
  });
});
