import { describe, expect, it } from "vitest";
import {
  CANONICAL_HOST,
  CONFIG_AREAS,
  buildProductionConfigMarkdown,
  countByStatus,
  productionConfigCsv,
  reportVerdict,
  probesForArea,
  type ConfigProbe,
  type ProductionConfigReport,
} from "@/lib/ops/production-config";

const probe = (over: Partial<ConfigProbe>): ConfigProbe => ({
  id: "p",
  area: "domain",
  label: "Check",
  status: "pass",
  observed: "Observed",
  ...over,
});

const report = (probes: ConfigProbe[]): ProductionConfigReport => ({
  generatedAt: "2026-08-11T09:00:00.000Z",
  actor: "admin@example.com",
  observedHost: CANONICAL_HOST,
  release: { version: "1.0.0-rc.1", marker: "release/2026-08-14", targetDate: "2026-08-14" },
  probes,
  capacity: [{ id: "c", label: "Cohort", value: "25 seats", bound: "Email allowance" }],
  limitations: [{ id: "l", limitation: "Single provider", impact: "Medium", mitigation: "Assistive only" }],
  contacts: [{ role: "Incident owner", owner: "Owner", channel: "support@x", scope: "P0" }],
});

describe("production config report", () => {
  it("blocks on any failure and never passes on an unmeasured area", () => {
    expect(reportVerdict([probe({}), probe({ id: "b", status: "fail" })])).toBe("blocked");
    expect(reportVerdict([probe({}), probe({ id: "u", status: "unknown" })])).toBe("conditional");
    expect(reportVerdict([probe({}), probe({ id: "a", status: "attention" })])).toBe("conditional");
    expect(reportVerdict([probe({})])).toBe("ready");
  });

  it("counts statuses and groups probes by area", () => {
    const probes = [probe({}), probe({ id: "s", area: "secrets", status: "fail" })];
    expect(countByStatus(probes)).toEqual({ pass: 1, attention: 0, fail: 1, unknown: 0 });
    expect(probesForArea(probes, "secrets")).toHaveLength(1);
    expect(probesForArea(probes, "ai")).toHaveLength(0);
  });

  it("renders every area heading present in the probe set", () => {
    const probes = CONFIG_AREAS.map((area) => probe({ id: area, area }));
    const md = buildProductionConfigMarkdown(report(probes));
    for (const area of CONFIG_AREAS) expect(md).toContain(area === "domain" ? "Domain" : "");
    expect(md).toContain("Infrastructure limitations and mitigation");
    expect(md).toContain("Incident contacts");
    expect(md).toContain("presence is reported by name only");
  });

  it("escapes CSV cells containing separators", () => {
    const csv = productionConfigCsv(report([probe({ observed: 'a, "b"' })]));
    expect(csv.split("\n")[0]).toBe("Area,Check,Status,Observed,Action");
    expect(csv).toContain('"a, ""b"""');
  });
});
