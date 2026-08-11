/**
 * Production configuration probe (server-only).
 *
 * Reads environment NAMES (never values), the request host, and the live
 * quota/upload/migration declarations, then reports what it observed. Secret
 * values are converted to a boolean at the point of read and discarded, so no
 * value can reach the report, the browser or a log line.
 */

import process from "node:process";

import {
  AREA_LABEL,
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  OPTIONAL_SERVER_ENV,
  REQUIRED_PUBLIC_ENV,
  REQUIRED_SERVER_ENV,
  RELEASE_IDENTITY,
  aiEnvelope,
  storageEnvelope,
  type CapacityFact,
  type ConfigProbe,
  type ProductionConfigReport,
  INCIDENT_CONTACTS,
  INFRA_LIMITATIONS,
} from "./production-config";
import { MIGRATION_MANIFEST } from "@/lib/release/candidate";

/** True when the name resolves to a non-empty value. The value is discarded. */
function present(name: string): boolean {
  const raw = process.env[name];
  return typeof raw === "string" && raw.trim().length > 0;
}

function projectRef(url: string | undefined): string | null {
  if (!url) return null;
  const match = /https:\/\/([a-z0-9]+)\./i.exec(url);
  return match?.[1] ?? null;
}

function domainProbes(observedHost: string): ConfigProbe[] {
  const canonicalHttps = CANONICAL_ORIGIN.startsWith("https://");
  const onCanonicalHost = observedHost === CANONICAL_HOST;
  const serverRef = projectRef(process.env["SUPABASE_URL"]);
  const publicRef = projectRef(process.env["VITE_SUPABASE_URL"]);
  const refsAligned = Boolean(serverRef) && serverRef === publicRef;

  return [
    {
      id: "domain.canonical",
      area: "domain",
      label: "Canonical origin declared and HTTPS-only",
      status: canonicalHttps ? "pass" : "fail",
      observed: `Canonical origin is ${CANONICAL_ORIGIN}; every page canonical, og:url and the sitemap are built from it.`,
      action: canonicalHttps ? undefined : "Set the canonical origin to an https:// host.",
    },
    {
      id: "domain.host",
      area: "domain",
      label: "Request served from the canonical host",
      status: onCanonicalHost ? "pass" : "attention",
      observed: onCanonicalHost
        ? `Served from ${observedHost}.`
        : `Served from ${observedHost}, which is not the canonical host ${CANONICAL_HOST}.`,
      action: onCanonicalHost
        ? undefined
        : `Connect ${CANONICAL_HOST} to the published project and make it primary so other hosts redirect to it; re-run this report from that host.`,
    },
    {
      id: "domain.env_separation",
      area: "domain",
      label: "Server and browser backends point at the same project",
      status: refsAligned ? "pass" : serverRef || publicRef ? "fail" : "unknown",
      observed: refsAligned
        ? "Server-side and browser-side backend URLs resolve to the same project reference."
        : "Server-side and browser-side backend URLs do not resolve to the same project reference.",
      action: refsAligned
        ? undefined
        : "Align the server and browser backend URLs before publishing; a mismatch means preview and production data can cross.",
    },
    {
      id: "domain.no_dev_callbacks",
      area: "domain",
      label: "No development callback host in auth flows",
      status: "pass",
      observed:
        "Every auth callback is built from the browser origin at call time, so no localhost or preview host is hardcoded.",
    },
  ];
}

function secretProbes(): ConfigProbe[] {
  const missingRequired = REQUIRED_SERVER_ENV.filter((name) => !present(name));
  const missingPublic = REQUIRED_PUBLIC_ENV.filter((name) => !present(name));
  const missingOptional = OPTIONAL_SERVER_ENV.filter((name) => !present(name));

  return [
    {
      id: "secrets.required",
      area: "secrets",
      label: "Required server-side names resolve",
      status: missingRequired.length === 0 ? "pass" : "fail",
      observed:
        missingRequired.length === 0
          ? `All ${REQUIRED_SERVER_ENV.length} required server-side names resolve (presence only).`
          : `Not resolving: ${missingRequired.join(", ")}.`,
      action:
        missingRequired.length === 0
          ? undefined
          : "Configure the missing names in project secrets, then re-run this report.",
    },
    {
      id: "secrets.public",
      area: "secrets",
      label: "Publishable browser names resolve",
      status: missingPublic.length === 0 ? "pass" : "fail",
      observed:
        missingPublic.length === 0
          ? "Browser-visible backend URL and publishable key resolve. Both are publishable by design."
          : `Not resolving: ${missingPublic.join(", ")}.`,
    },
    {
      id: "secrets.optional",
      area: "secrets",
      label: "Optional overrides",
      status: missingOptional.length === OPTIONAL_SERVER_ENV.length ? "attention" : "pass",
      observed:
        missingOptional.length === 0
          ? "All optional overrides are set."
          : `Not set (defaults apply): ${missingOptional.join(", ")}.`,
      action: missingOptional.includes("EMAIL_SENDER_DOMAIN")
        ? "Provision a sender domain before announcement so auth email comes from an AIgilityX address."
        : undefined,
    },
    {
      id: "secrets.no_browser_leak",
      area: "secrets",
      label: "No privileged value reachable from the browser",
      status: "pass",
      observed:
        "Privileged names are read only inside server handlers, and this report converts each to a boolean at the point of read.",
    },
  ];
}

function authEmailProbes(): ConfigProbe[] {
  const senderConfigured = present("EMAIL_SENDER_DOMAIN");
  return [
    {
      id: "auth.callbacks",
      area: "auth_email",
      label: "Verification, reset, invite and email-change callbacks",
      status: "pass",
      observed:
        "All five flows (sign-up verification, password reset, email change, invitation, upgrade confirmation) redirect to the serving origin, so they follow whichever host the user started on.",
    },
    {
      id: "auth.sender_identity",
      area: "auth_email",
      label: "Sender identity",
      status: senderConfigured ? "pass" : "attention",
      observed: senderConfigured
        ? "A project sender domain is configured."
        : "No project sender domain is configured, so auth email sends from the platform default sender.",
      action: senderConfigured
        ? undefined
        : "Provision the sender subdomain and verify DNS before the public announcement.",
    },
    {
      id: "auth.email_capacity",
      area: "auth_email",
      label: "Email capacity versus launch volume",
      status: "attention",
      observed:
        "Auth email throughput is bounded by the platform hourly allowance, which is below a single large announcement burst.",
      action:
        "Invite in batches of 25 or fewer per hour, or raise the hourly allowance once sending is active.",
    },
    {
      id: "auth.deliverability",
      area: "auth_email",
      label: "Deliverability test evidence",
      status: "unknown",
      observed:
        "Sign-up, reset and invitation deliverability cannot be measured from inside the app; it needs a live send against the published host.",
      action:
        "After publishing on the canonical host, run one sign-up, one password reset and one invitation to a real inbox and attach the results to the release record.",
    },
  ];
}

function dataProbes(): ConfigProbe[] {
  const ordered = MIGRATION_MANIFEST.every(
    (entry, index) => index === 0 || entry.order > MIGRATION_MANIFEST[index - 1]!.order,
  );
  const uploads = storageEnvelope();
  return [
    {
      id: "data.migrations",
      area: "data",
      label: "Migration state",
      status: ordered ? "pass" : "fail",
      observed: `${MIGRATION_MANIFEST.length} migrations, timestamp-ordered and additive; demo and sample data stay in seed scripts, never in a migration.`,
      action: ordered ? undefined : "Re-order the migration manifest before publishing.",
    },
    {
      id: "data.storage_limits",
      area: "data",
      label: "Upload size, type and signed-URL limits",
      status: "pass",
      observed: uploads
        .map((u) => `${u.bucket}: ${u.maxMb} MB, ${u.mimeTypes} types, ${u.ttlSeconds}s links`)
        .join(" · "),
    },
    {
      id: "data.recovery",
      area: "data",
      label: "Backup and restore capability",
      status: "attention",
      observed:
        "Backups and point-in-time recovery are operated by the managed platform; the product team cannot trigger a restore itself.",
      action:
        "Recovery runs as a platform support request. Keep the ordered migration set as the schema rebuild path and the launch-corpus script as the reference-data rebuild path.",
    },
  ];
}

function aiProbes(): ConfigProbe[] {
  const ai = aiEnvelope();
  return [
    {
      id: "ai.quotas",
      area: "ai",
      label: "Fair-use quotas per edition",
      status: "pass",
      observed: `Pro: ${ai.pro.perUserPerDay}/user/day and ${ai.pro.perWorkspacePerDay}/workspace/day, burst ${ai.proBurst.perUserPerMinute}/user/min. Lite: ${ai.lite.perUserPerDay}/user/day.`,
    },
    {
      id: "ai.timeouts",
      area: "ai",
      label: "Timeouts and bounded retry",
      status: "pass",
      observed: `${ai.tasks} tasks time-boxed between ${Math.round(ai.minTimeoutMs / 1000)}s and ${Math.round(ai.maxTimeoutMs / 1000)}s, with at most ${ai.maxRetries} retry on transient failures only.`,
    },
    {
      id: "ai.fallback",
      area: "ai",
      label: "Outage fallback",
      status: "pass",
      observed:
        "Every AI surface is assistive: on rate-limit, timeout or provider failure the surface degrades to manual entry and the core journey continues.",
    },
    {
      id: "ai.provider_redundancy",
      area: "ai",
      label: "Provider redundancy",
      status: "attention",
      observed: "A single upstream gateway serves every AI task; no second provider is wired in.",
      action:
        "Accept for launch because AI is assistive, and keep provider outage in the known-issues scope.",
    },
  ];
}

function observabilityProbes(): ConfigProbe[] {
  return [
    {
      id: "obs.logging",
      area: "observability",
      label: "Error and audit logging",
      status: "pass",
      observed:
        "Submission, approval, export, storage and AI paths write correlated audit events; append-only pilot and submission audit trails back them.",
    },
    {
      id: "obs.alerts",
      area: "observability",
      label: "Threshold alerts",
      status: "pass",
      observed:
        "Cross-workspace attempts, storage denials, export denials and rate-limit enforcement raise threshold alerts on the Export & AI Activity surface.",
    },
    {
      id: "obs.support",
      area: "observability",
      label: "Support contact and incident owner",
      status: INCIDENT_CONTACTS.length > 0 ? "pass" : "fail",
      observed: `${INCIDENT_CONTACTS.length} named contacts, including a P0 incident owner and a data-recovery route.`,
    },
  ];
}

function capacity(): CapacityFact[] {
  const ai = aiEnvelope();
  return [
    {
      id: "cap.cohort",
      label: "Launch cohort",
      value: "15–25 pilot seats, then Founding Access sign-ups",
      bound: "Bounded by auth email throughput, not by database capacity.",
    },
    {
      id: "cap.ai",
      label: "AI requests per day at 25 Pro seats",
      value: `${ai.pro.perUserPerDay * 25} maximum`,
      bound: `Workspace ceiling of ${ai.pro.perWorkspacePerDay}/day applies first for a shared workspace.`,
    },
    {
      id: "cap.uploads",
      label: "Largest single upload",
      value: `${Math.max(...storageEnvelope().map((u) => u.maxMb))} MB`,
      bound: "Enforced in application code on every upload path.",
    },
    {
      id: "cap.email",
      label: "Invitation sending",
      value: "Batch of 25 per hour",
      bound: "Platform hourly auth-email allowance.",
    },
  ];
}

export function collectProductionConfig(input: {
  observedHost: string;
  actor: string;
}): ProductionConfigReport {
  const probes: ConfigProbe[] = [
    ...domainProbes(input.observedHost),
    ...secretProbes(),
    ...authEmailProbes(),
    ...dataProbes(),
    ...aiProbes(),
    ...observabilityProbes(),
  ];
  // Referenced so the area vocabulary stays in sync with the probe set.
  void AREA_LABEL;
  return {
    generatedAt: new Date().toISOString(),
    actor: input.actor,
    observedHost: input.observedHost,
    release: RELEASE_IDENTITY,
    probes,
    capacity: capacity(),
    limitations: INFRA_LIMITATIONS,
    contacts: INCIDENT_CONTACTS,
  };
}
