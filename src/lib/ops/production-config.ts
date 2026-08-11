/**
 * Production configuration model (pure).
 *
 * One place describes what "production ready" means for the 14 August launch:
 * the host and HTTPS contract, which server-side secret NAMES must be present
 * (never values), the auth/email sender contract, the database and storage
 * capacity envelope, the AI quota/timeout/fallback envelope, and who owns an
 * incident. Observed values are supplied by the server probe; nothing here
 * guesses — an area with no measurement reports "unknown", never "pass".
 */

import { SITE_URL } from "@/lib/seo";
import { BUCKET_POLICIES, type StorageBucket } from "@/lib/storage/storage-policy";
import { PROMPT_REGISTRY, AI_TASKS } from "@/lib/ai/prompts";
import { limitsForEdition, burstLimitsForEdition } from "@/lib/ai/fair-use";
import { SUPPORT_EMAIL } from "@/lib/feedback/feedback.model";
import { RELEASE_MARKER, RELEASE_TARGET_DATE, RELEASE_VERSION } from "@/lib/release";

export type ProbeStatus = "pass" | "attention" | "fail" | "unknown";

export const CONFIG_AREAS = [
  "domain",
  "secrets",
  "auth_email",
  "data",
  "ai",
  "observability",
] as const;

export type ConfigArea = (typeof CONFIG_AREAS)[number];

export const AREA_LABEL: Record<ConfigArea, string> = {
  domain: "Domain, HTTPS and environment separation",
  secrets: "Secret presence (names only)",
  auth_email: "Auth redirects, sender identity and email capacity",
  data: "Database, migrations, storage and recovery",
  ai: "AI quotas, timeouts and outage fallback",
  observability: "Error logging, alerting and incident ownership",
};

export type ConfigProbe = {
  id: string;
  area: ConfigArea;
  label: string;
  status: ProbeStatus;
  /** What was actually observed. Must never contain a secret value. */
  observed: string;
  /** What to do when the status is not a pass. */
  action?: string;
};

export type CapacityFact = {
  id: string;
  label: string;
  value: string;
  /** Headroom or the constraint that bounds this figure. */
  bound: string;
};

export type InfraLimitation = {
  id: string;
  limitation: string;
  impact: "High" | "Medium" | "Low";
  mitigation: string;
};

export type IncidentContact = {
  role: string;
  owner: string;
  channel: string;
  scope: string;
};

/* --------------------------------------------------------------- contracts */

/** Canonical public host. Everything else must redirect to it. */
export const CANONICAL_ORIGIN = SITE_URL;
export const CANONICAL_HOST = CANONICAL_ORIGIN.replace(/^https?:\/\//, "");

/**
 * Server-side environment names that must resolve in production. Presence is
 * reported as a boolean — the value is never read into the report.
 */
export const REQUIRED_SERVER_ENV: readonly string[] = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LOVABLE_API_KEY",
  "CRON_HOOK_SECRET",
];

/** Public (browser-visible) names. These are publishable by design. */
export const REQUIRED_PUBLIC_ENV: readonly string[] = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

/** Optional names that unlock capability but are not launch blockers. */
export const OPTIONAL_SERVER_ENV: readonly string[] = [
  "EMAIL_SENDER_DOMAIN",
  "AI_FAIR_USE_PER_USER_PER_DAY",
  "AI_FAIR_USE_PER_WORKSPACE_PER_DAY",
];

/** Auth flows whose callback must resolve on the canonical host. */
export const AUTH_CALLBACK_FLOWS: readonly string[] = [
  "Sign-up verification (/auth)",
  "Password reset (/forgot-password → /reset-password)",
  "Email change confirmation (/account/security)",
  "Workspace and pilot invitations (/invite)",
  "Founding-access upgrade confirmation (/pro → /profile)",
];

/* ------------------------------------------------------------- limitations */

export const INFRA_LIMITATIONS: readonly InfraLimitation[] = [
  {
    id: "email-sender",
    limitation:
      "No project sender domain is provisioned, so auth email sends from the platform default sender rather than an AIgilityX address.",
    impact: "High",
    mitigation:
      "Provision the sender subdomain (for example notify.aigilityx.com) before announcement; until then keep announcement volume inside the platform auth-email allowance and stage invitations in batches.",
  },
  {
    id: "email-rate",
    limitation:
      "Auth email throughput is capped per hour by the platform allowance, which is well below a single large announcement burst.",
    impact: "Medium",
    mitigation:
      "Invite in batches of 25 or fewer per hour. The pilot roster importer already provisions seats without sending in one burst.",
  },
  {
    id: "bucket-level-limits",
    limitation:
      "Bucket-level size and MIME ceilings cannot be set on this managed backend; the storage schema is not migratable from the app.",
    impact: "Medium",
    mitigation:
      "Size, MIME and extension limits are enforced in application code on every upload path, and signed URLs are short-lived and re-authorised on issue.",
  },
  {
    id: "backup-ownership",
    limitation:
      "Backups and point-in-time recovery are operated by the managed platform; the product team cannot trigger a restore itself.",
    impact: "Medium",
    mitigation:
      "Recovery is a platform support request. Schema is reproducible from the ordered additive migration set, and a launch-corpus reseed script exists for reference data.",
  },
  {
    id: "instance-size",
    limitation: "The database runs on the smallest managed instance tier.",
    impact: "Low",
    mitigation:
      "Current utilisation leaves large headroom for the launch cohort; compute can be resized without a schema change if connection or memory pressure appears.",
  },
  {
    id: "ai-provider",
    limitation: "AI capability depends on an upstream gateway with no second provider wired in.",
    impact: "Medium",
    mitigation:
      "Every AI surface is assistive only: the core journey works without it, calls are time-boxed with bounded retry, and failures degrade to manual entry rather than blocking.",
  },
];

export const INCIDENT_CONTACTS: readonly IncidentContact[] = [
  {
    role: "Incident owner (P0)",
    owner: "AIgilityX platform owner",
    channel: SUPPORT_EMAIL,
    scope: "Declares a P0, owns comms and the go/no-go on rollback.",
  },
  {
    role: "Product support",
    owner: "UseCasesX support desk",
    channel: SUPPORT_EMAIL,
    scope: "First line for user reports; routes through Requests Inbox triage.",
  },
  {
    role: "Data recovery",
    owner: "Managed platform support",
    channel: "Lovable Cloud support request",
    scope: "Backups, point-in-time recovery and database restore.",
  },
  {
    role: "Security and abuse",
    owner: "AIgilityX platform owner",
    channel: SUPPORT_EMAIL,
    scope: "Acts on cross-workspace, storage-denied and rate-limit alerts on Export & AI Activity.",
  },
];

/* ----------------------------------------------------------------- derived */

/** AI timeout/retry envelope taken from the live prompt registry. */
export function aiEnvelope() {
  const defs = AI_TASKS.map((task) => PROMPT_REGISTRY[task]);
  const timeouts = defs.map((d) => d.timeoutMs);
  return {
    tasks: defs.length,
    minTimeoutMs: Math.min(...timeouts),
    maxTimeoutMs: Math.max(...timeouts),
    maxRetries: Math.max(...defs.map((d) => d.retries)),
    pro: limitsForEdition("pro"),
    proBurst: burstLimitsForEdition("pro"),
    lite: limitsForEdition("lite"),
  };
}

/** Upload envelope taken from the live bucket policies. */
export function storageEnvelope(): {
  bucket: StorageBucket;
  maxMb: number;
  mimeTypes: number;
  ttlSeconds: number;
}[] {
  return (Object.keys(BUCKET_POLICIES) as StorageBucket[]).map((bucket) => {
    const policy = BUCKET_POLICIES[bucket];
    return {
      bucket,
      maxMb: Math.round(policy.maxBytes / (1024 * 1024)),
      mimeTypes: policy.mimeTypes.length,
      ttlSeconds: policy.signedUrlTtlSeconds,
    };
  });
}

export type ProductionConfigReport = {
  generatedAt: string;
  actor: string;
  /** Host the report was generated from — evidence of where it ran. */
  observedHost: string;
  release: { version: string; marker: string; targetDate: string };
  probes: readonly ConfigProbe[];
  capacity: readonly CapacityFact[];
  limitations: readonly InfraLimitation[];
  contacts: readonly IncidentContact[];
};

export type ReportVerdict = "ready" | "conditional" | "blocked";

export function reportVerdict(probes: readonly ConfigProbe[]): ReportVerdict {
  if (probes.some((p) => p.status === "fail")) return "blocked";
  if (probes.some((p) => p.status === "attention" || p.status === "unknown")) return "conditional";
  return "ready";
}

export function countByStatus(probes: readonly ConfigProbe[]): Record<ProbeStatus, number> {
  const out: Record<ProbeStatus, number> = { pass: 0, attention: 0, fail: 0, unknown: 0 };
  for (const probe of probes) out[probe.status] += 1;
  return out;
}

export function probesForArea(
  probes: readonly ConfigProbe[],
  area: ConfigArea,
): readonly ConfigProbe[] {
  return probes.filter((probe) => probe.area === area);
}

/* --------------------------------------------------------------- artifacts */

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function productionConfigCsv(report: ProductionConfigReport): string {
  const rows: string[][] = [["Area", "Check", "Status", "Observed", "Action"]];
  for (const probe of report.probes) {
    rows.push([
      AREA_LABEL[probe.area],
      probe.label,
      probe.status,
      probe.observed,
      probe.action ?? "",
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildProductionConfigMarkdown(report: ProductionConfigReport): string {
  const counts = countByStatus(report.probes);
  const verdict = reportVerdict(report.probes);
  const lines: string[] = [
    `# Production configuration report — ${report.release.version}`,
    "",
    `- Generated: ${report.generatedAt}`,
    `- Generated by: ${report.actor}`,
    `- Observed host: ${report.observedHost}`,
    `- Canonical host: ${CANONICAL_HOST}`,
    `- Release marker: ${report.release.marker} (target ${report.release.targetDate})`,
    `- Verdict: **${verdict.toUpperCase()}** — ${counts.pass} pass · ${counts.attention} attention · ${counts.fail} fail · ${counts.unknown} not measured`,
    "",
  ];

  for (const area of CONFIG_AREAS) {
    const probes = probesForArea(report.probes, area);
    if (probes.length === 0) continue;
    lines.push(`## ${AREA_LABEL[area]}`, "");
    lines.push("| Check | Status | Observed | Action |", "| --- | --- | --- | --- |");
    for (const probe of probes) {
      lines.push(
        `| ${probe.label} | ${probe.status} | ${probe.observed} | ${probe.action ?? "—"} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Capacity assessment", "", "| Measure | Value | Bound |", "| --- | --- | --- |");
  for (const fact of report.capacity) {
    lines.push(`| ${fact.label} | ${fact.value} | ${fact.bound} |`);
  }

  lines.push(
    "",
    "## Infrastructure limitations and mitigation",
    "",
    "| Limitation | Impact | Mitigation |",
    "| --- | --- | --- |",
  );
  for (const item of report.limitations) {
    lines.push(`| ${item.limitation} | ${item.impact} | ${item.mitigation} |`);
  }

  lines.push(
    "",
    "## Incident contacts",
    "",
    "| Role | Owner | Channel | Scope |",
    "| --- | --- | --- | --- |",
  );
  for (const contact of report.contacts) {
    lines.push(`| ${contact.role} | ${contact.owner} | ${contact.channel} | ${contact.scope} |`);
  }

  lines.push("", "No secret values appear in this report — presence is reported by name only.", "");
  return lines.join("\n");
}

export const RELEASE_IDENTITY = {
  version: RELEASE_VERSION,
  marker: RELEASE_MARKER,
  targetDate: RELEASE_TARGET_DATE,
};
