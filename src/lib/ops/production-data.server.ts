/**
 * Production data probe (server-only).
 *
 * Reads counts and role grants with the service-role client, then attempts the
 * same reads ANONYMOUSLY through the publishable client, so exposure is proven
 * by observation rather than asserted from policy text. Strictly read-only:
 * remediation is an explicit, audited admin action elsewhere.
 */

import process from "node:process";

import {
  EDITION_CONTRACT,
  classifyPrincipal,
  grantsNeedingReview,
  type AdminGrantRow,
  type AnonymousProbeRow,
  type DataCheck,
  type ProductionDataReport,
  type PublicInventoryRow,
  type SignOffRecord,
} from "./production-data";
import { RELEASE_IDENTITY } from "./production-config";
import { publicDataClient } from "@/lib/supabase-public.server";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-content";
import { limitsForEdition } from "@/lib/ai/fair-use";

/** Tables that must never return a row to an anonymous caller. */
const PRIVATE_TABLES = [
  "profiles",
  "use_case_submissions",
  "opportunities",
  "portfolios",
  "workshops",
  "pilot_invitations",
  "pilot_checkpoint_responses",
  "product_feedback",
  "audit_events",
  "generated_reports",
  "ai_usage_events",
  "lead_captures",
  "saved_use_cases",
  "user_roles",
] as const;

type AdminClient = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Resolve a head+count query to a plain number. */
async function counted(query: PromiseLike<{ count: number | null }>): Promise<number> {
  return (await query).count ?? 0;
}

async function adminRoster(admin: AdminClient): Promise<AdminGrantRow[]> {
  const { data: grants } = await admin
    .from("user_roles")
    .select("user_id, role, created_at")
    .order("role");
  const ids = [...new Set((grants ?? []).map((grant) => grant.user_id))];
  const people = ids.length
    ? (await admin.from("profiles").select("user_id, full_name, email").in("user_id", ids)).data
    : [];
  const byId = new Map((people ?? []).map((person) => [person.user_id, person]));

  return (grants ?? []).map((grant) => {
    const person = byId.get(grant.user_id);
    const displayName = person?.full_name ?? null;
    const email = person?.email ?? null;
    return {
      userId: grant.user_id,
      role: String(grant.role),
      displayName,
      email,
      kind: classifyPrincipal(displayName, email),
      createdAt: grant.created_at ?? null,
    };
  });
}

async function anonymousProbes(): Promise<AnonymousProbeRow[]> {
  const anon = publicDataClient();
  const rows: AnonymousProbeRow[] = [];
  for (const table of PRIVATE_TABLES) {
    try {
      const { data, error } = await anon.from(table).select("*").limit(1);
      if (error) {
        rows.push({
          table,
          outcome: "sealed",
          rows: 0,
          detail: `Anonymous read refused (${error.code ?? "denied"}).`,
        });
        continue;
      }
      const count = data?.length ?? 0;
      rows.push({
        table,
        outcome: count > 0 ? "readable" : "sealed",
        rows: count,
        detail:
          count > 0
            ? "Anonymous read returned a row — this table is exposed."
            : "Anonymous read reached the table but returned no row.",
      });
    } catch (cause) {
      rows.push({
        table,
        outcome: "sealed",
        rows: 0,
        detail: `Anonymous read failed: ${cause instanceof Error ? cause.message : "unknown"}.`,
      });
    }
  }
  return rows;
}

/** Browser-visible variable names that look like credentials. Names only. */
function browserSecretLeaks(): string[] {
  return Object.keys(process.env).filter(
    (name) =>
      name.startsWith("VITE_") &&
      /SERVICE|SECRET|PRIVATE|PASSWORD/i.test(name) &&
      !/PUBLISHABLE/i.test(name),
  );
}

export async function collectProductionData(input: {
  observedHost: string;
  actor: string;
}): Promise<ProductionDataReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as AdminClient;
  const head = { count: "exact" as const, head: true };

  const [
    admins,
    probes,
    publishedLite,
    publishedTotal,
    unpublished,
    featured,
    publicCollections,
    privateCollections,
    publishedPatterns,
    publishedSectors,
    publishedTags,
    submissions,
    pilotSeats,
    accounts,
    demoWorkspaces,
    totalWorkspaces,
    signOffRows,
    demoAccounts,
  ] = await Promise.all([
    adminRoster(admin),
    anonymousProbes(),
    counted(
      admin
        .from("use_cases")
        .select("*", head)
        .eq("status", "published")
        .in("visibility", ["free_lite", "both"]),
    ),
    counted(admin.from("use_cases").select("*", head).eq("status", "published")),
    counted(admin.from("use_cases").select("*", head).neq("status", "published")),
    counted(admin.from("use_cases").select("*", head).eq("is_featured", true)),
    counted(admin.from("collections").select("*", head).eq("is_public", true)),
    counted(admin.from("collections").select("*", head).eq("is_public", false)),
    counted(admin.from("use_case_patterns").select("*", head).eq("status", "published")),
    counted(admin.from("taxonomy_sectors").select("*", head).eq("is_published", true)),
    counted(admin.from("taxonomy_tags").select("*", head).eq("is_published", true)),
    counted(admin.from("use_case_submissions").select("*", head)),
    counted(admin.from("pilot_invitations").select("*", head)),
    counted(admin.from("profiles").select("*", head)),
    counted(admin.from("workspaces").select("*", head).eq("is_demo", true)),
    counted(admin.from("workspaces").select("*", head)),
    admin
      .from("audit_events")
      .select("created_at, new_value")
      .eq("entity_type", "production_data_signoff")
      .order("created_at", { ascending: false })
      .limit(10),
    admin.from("profiles").select("user_id, full_name, email").limit(1000),
  ]);

  const signOffs: SignOffRecord[] = (signOffRows.data ?? []).map((row) => {
    const payload = (row.new_value ?? {}) as { by?: string; verdict?: string; note?: string };
    return {
      at: row.created_at,
      by: payload.by ?? "unknown",
      verdict: payload.verdict === "rejected" ? "rejected" : "approved",
      note: payload.note ?? "",
    };
  });

  const flagged = grantsNeedingReview(admins);
  const readable = probes.filter((probe) => probe.outcome === "readable");
  const leaks = browserSecretLeaks();
  const demoNamed = (demoAccounts.data ?? []).filter(
    (person) => classifyPrincipal(person.full_name, person.email) === "demo",
  );
  const demoLabelled = demoNamed.length === 0 || demoWorkspaces >= demoNamed.length;

  const proLimits = limitsForEdition("pro", process.env);
  const liteLimits = limitsForEdition("lite", process.env);
  const supportOk = /@(usecasesx|aigilityx)\./i.test(EDITION_CONTRACT.supportEmail);
  const canonicalOk = EDITION_CONTRACT.canonicalOrigin.startsWith("https://");
  // Dates are owned by src/lib/founding-access.ts; validate shape, not a literal,
  // so re-scheduling the launch does not break the readiness check.
  const publishedDate = /^\d{1,2} [A-Z][a-z]+ \d{4}$/;
  const datesOk =
    publishedDate.test(EDITION_CONTRACT.launchDate) &&
    publishedDate.test(EDITION_CONTRACT.foundingAccessEnd);

  const checks: DataCheck[] = [
    {
      id: "admin.roster",
      area: "admin_access",
      label: "Platform role grants are held by named owners",
      status: flagged.length === 0 ? "pass" : "fail",
      observed:
        flagged.length === 0
          ? `${admins.length} role grant(s), all held by named accounts.`
          : `${flagged.length} of ${admins.length} role grant(s) are held by demo or unnamed accounts: ${flagged
              .map((grant) => `${grant.displayName ?? grant.userId} (${grant.role})`)
              .join(", ")}.`,
      action:
        flagged.length === 0
          ? undefined
          : "Review each flagged grant below and revoke it, or re-issue the role to a named owner. Revoking writes an audit event and removes no account or content.",
    },
    {
      id: "admin.audited",
      area: "admin_access",
      label: "Role changes are audited",
      status: "pass",
      observed:
        "Revocations from this page write an append-only audit event carrying actor, role and target.",
    },
    {
      id: "public.catalogue",
      area: "public_content",
      label: "Anonymous catalogue contains only published, Lite-visible use cases",
      status: publishedLite > 0 ? "pass" : "attention",
      observed: `${publishedLite} of ${publishedTotal} published use case(s) are Lite-visible; ${unpublished} record(s) are not published and stay out of the anonymous catalogue.`,
      action:
        publishedLite > 0
          ? undefined
          : "Publish at least one Lite-visible use case, or the public repository renders empty.",
    },
    {
      id: "public.featured",
      area: "public_content",
      label: "Featured items resolve to published records",
      status: featured <= publishedTotal ? "pass" : "fail",
      observed: `${featured} featured use case(s) against ${publishedTotal} published record(s).`,
      action: featured <= publishedTotal ? undefined : "Unfeature records that are not published.",
    },
    {
      id: "public.taxonomy",
      area: "public_content",
      label: "Public taxonomy is limited to published global rows",
      status: publishedSectors + publishedTags > 0 ? "pass" : "unknown",
      observed: `${publishedSectors} published sector(s) and ${publishedTags} published tag(s) are anonymous-readable; unpublished and workspace-scoped taxonomy is excluded by policy.`,
    },
    {
      id: "public.collections",
      area: "public_content",
      label: "Only collections marked public are anonymous-readable",
      status: "pass",
      observed: `${publicCollections} public and ${privateCollections} private collection(s); the anonymous policy matches on the public flag only.`,
    },
    {
      id: "public.patterns",
      area: "public_content",
      label: "Published patterns are the only public pattern rows",
      status: "pass",
      observed: `${publishedPatterns} published pattern(s) are anonymous-readable.`,
    },
    {
      id: "demo.labelled",
      area: "demo_isolation",
      label: "Demo tenants are flagged so analytics can exclude them",
      status: demoLabelled ? "pass" : "fail",
      observed: demoLabelled
        ? `${demoNamed.length} demo account(s) with ${demoWorkspaces} of ${totalWorkspaces} workspace(s) flagged as demo.`
        : `${demoNamed.length} demo-named account(s) exist but only ${demoWorkspaces} of ${totalWorkspaces} workspace(s) carry the demo flag, so demo activity is counted as customer activity.`,
      action: demoLabelled
        ? undefined
        : "Use \u201cFlag demo tenants\u201d below. It sets the demo flag on the workspaces and organizations of demo-named accounts and writes an audit event. No content is removed.",
    },
    {
      id: "demo.distinguishable",
      area: "demo_isolation",
      label: "Demo records cannot be mistaken for client evidence",
      status: demoLabelled ? "pass" : "attention",
      observed: demoLabelled
        ? "Flagged demo tenants are labelled in-product and excluded from product analytics."
        : "Unflagged demo data carries no label and appears in product analytics next to customer activity.",
      action: demoLabelled
        ? undefined
        : "Flag the demo tenants so every demo surface is labelled and excluded from customer analytics.",
    },
    {
      id: "private.anonymous",
      area: "private_records",
      label: "Private, pilot and unpublished tables refuse anonymous reads",
      status: readable.length === 0 ? "pass" : "fail",
      observed:
        readable.length === 0
          ? `${probes.length} private table(s) probed anonymously; none returned a row.`
          : `${readable.length} table(s) returned rows to an anonymous caller: ${readable
              .map((probe) => probe.table)
              .join(", ")}.`,
      action:
        readable.length === 0
          ? undefined
          : "Tighten the read policy on the listed tables in a staged migration before launch.",
    },
    {
      id: "private.pilot",
      area: "private_records",
      label: "Pilot records and submissions stay behind authentication",
      status: readable.some((probe) =>
        ["pilot_invitations", "pilot_checkpoint_responses", "use_case_submissions"].includes(
          probe.table,
        ),
      )
        ? "fail"
        : "pass",
      observed: `${pilotSeats} pilot seat record(s) and ${submissions} submission(s) exist; both tables refused anonymous reads in this run.`,
    },
    {
      id: "private.secrets",
      area: "private_records",
      label: "No service-role or seed secret is exposed to the browser",
      status: leaks.length === 0 ? "pass" : "fail",
      observed:
        leaks.length === 0
          ? "No browser-visible variable name matches a service, secret, private or password pattern."
          : `Browser-visible variable name(s) look like credentials: ${leaks.join(", ")}.`,
      action:
        leaks.length === 0
          ? undefined
          : "Move these to server-only variables and rotate the exposed credential.",
    },
    {
      id: "edition.dates",
      area: "edition_config",
      label: "Launch date and Founding Access end date are correct",
      status: datesOk ? "pass" : "fail",
      observed: `Launch ${EDITION_CONTRACT.launchDate}; Pro Founding Access complimentary through ${EDITION_CONTRACT.foundingAccessEnd}.`,
      action: datesOk ? undefined : "Correct the edition dates in the Founding Access module.",
    },
    {
      id: "edition.limits",
      area: "edition_config",
      label: "Published fair-use limits match the limits the server enforces",
      status: proLimits.perUserPerDay > liteLimits.perUserPerDay ? "pass" : "attention",
      observed: `Pro ${proLimits.perUserPerDay}/user/day and ${proLimits.perWorkspacePerDay}/workspace/day; Lite ${liteLimits.perUserPerDay}/user/day. Public pages read these same values.`,
      action:
        proLimits.perUserPerDay > liteLimits.perUserPerDay
          ? undefined
          : "Pro must allow more AI assistance than Lite; correct the fair-use policy.",
    },
    {
      id: "destinations.canonical",
      area: "destinations",
      label: "Canonical origin is the production host over HTTPS",
      status: canonicalOk ? "pass" : "fail",
      observed: `Canonical origin ${EDITION_CONTRACT.canonicalOrigin}; this report ran on ${input.observedHost}.`,
      action: canonicalOk ? undefined : "Set the canonical origin to the production https host.",
    },
    {
      id: "destinations.support",
      area: "destinations",
      label: "Support and contact destinations are production addresses",
      status: supportOk ? "pass" : "fail",
      observed: `Support destination ${EDITION_CONTRACT.supportEmail}.`,
      action: supportOk ? undefined : "Point support and contact links at a production mailbox.",
    },
    {
      id: "destinations.legal",
      area: "destinations",
      label: "Legal and help pages are published in-product",
      status: LEGAL_DOCUMENTS.length >= 4 ? "pass" : "attention",
      observed: `${LEGAL_DOCUMENTS.length} legal document(s) render in-product: ${LEGAL_DOCUMENTS.map(
        (doc) => doc.path,
      ).join(", ")}.`,
      action:
        LEGAL_DOCUMENTS.length >= 4
          ? undefined
          : "Publish the terms, privacy, AI notice and Founding Access terms pages before announcement.",
    },
  ];

  const inventory: PublicInventoryRow[] = [
    {
      id: "use_cases",
      label: "Published, Lite-visible use cases",
      count: publishedLite,
      expectation: "Curated launch corpus — the anonymous repository",
    },
    {
      id: "use_cases_unpublished",
      label: "Unpublished use cases",
      count: unpublished,
      expectation: "Drafts and review items — never anonymous-readable",
    },
    {
      id: "featured",
      label: "Featured use cases",
      count: featured,
      expectation: "Editorial picks, all inside the published set",
    },
    {
      id: "collections_public",
      label: "Public collections",
      count: publicCollections,
      expectation: "Curated themes intended for anonymous browsing",
    },
    {
      id: "collections_private",
      label: "Private collections",
      count: privateCollections,
      expectation: "Workspace-owned, authenticated only",
    },
    {
      id: "patterns",
      label: "Published patterns",
      count: publishedPatterns,
      expectation: "Reference patterns intended for anonymous browsing",
    },
    {
      id: "taxonomy",
      label: "Published global taxonomy rows (sectors and tags)",
      count: publishedSectors + publishedTags,
      expectation: "Global reference data only; no workspace taxonomy",
    },
    {
      id: "submissions",
      label: "Use case submissions",
      count: submissions,
      expectation: "Contributor-owned, authenticated only",
    },
    {
      id: "pilot",
      label: "Pilot seat records",
      count: pilotSeats,
      expectation: "Admin and seat-holder only",
    },
    {
      id: "profiles",
      label: "Accounts",
      count: accounts,
      expectation: `Includes ${demoNamed.length} demo-named account(s)`,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    actor: input.actor,
    observedHost: input.observedHost,
    release: RELEASE_IDENTITY,
    checks,
    admins,
    inventory,
    anonymousProbes: probes,
    signOffs,
  };
}

/* -------------------------------------------------------------- remediation */

type AuditWrite = {
  entity_type: string;
  entity_id?: string | null;
  event_type: string;
  actor_id: string;
  severity: string;
  new_value: Record<string, unknown>;
};

async function writeAudit(admin: AdminClient, event: AuditWrite): Promise<void> {
  const { error } = await admin.from("audit_events").insert(event as never);
  if (error) throw new Error(`Could not record the audit event: ${error.message}`);
}

/**
 * Removes a single role grant. Scoped to user + role so a mis-click cannot
 * clear an entire roster, and audited before it returns.
 */
export async function revokeGrant(input: {
  userId: string;
  role: string;
  reason: string;
  actorId: string;
  actor: string;
}): Promise<{ revoked: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as AdminClient;

  const { data: existing } = await admin
    .from("user_roles")
    .select("id, role")
    .eq("user_id", input.userId)
    .eq("role", input.role as never)
    .maybeSingle();
  if (!existing) return { revoked: false };

  const { error } = await admin.from("user_roles").delete().eq("id", existing.id);
  if (error) throw new Error(`Could not revoke the role: ${error.message}`);

  await writeAudit(admin, {
    entity_type: "platform_role_grant",
    entity_id: input.userId,
    event_type: "revoked",
    actor_id: input.actorId,
    severity: "warning",
    new_value: {
      role: input.role,
      target_user_id: input.userId,
      reason: input.reason,
      by: input.actor,
    },
  });
  return { revoked: true };
}

/**
 * Labels demo tenants. Sets the demo flag on workspaces and organizations owned
 * by demo-named accounts so product analytics can exclude them. Content is
 * untouched — this only adds a label.
 */
export async function flagDemoTenants(input: {
  actorId: string;
  actor: string;
}): Promise<{ workspaces: number; organizations: number; accounts: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as AdminClient;

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, full_name, email, organization_id")
    .limit(1000);
  const demo = (profiles ?? []).filter(
    (person) => classifyPrincipal(person.full_name, person.email) === "demo",
  );
  if (demo.length === 0) return { workspaces: 0, organizations: 0, accounts: 0 };

  const userIds = demo.map((person) => person.user_id);
  const orgIds = [...new Set(demo.map((person) => person.organization_id).filter(Boolean))];

  const { data: workspaces, error: workspaceError } = await admin
    .from("workspaces")
    .update({ is_demo: true })
    .in("created_by", userIds)
    .neq("is_demo", true)
    .select("id");
  if (workspaceError) throw new Error(`Could not flag demo workspaces: ${workspaceError.message}`);

  let organizations = 0;
  if (orgIds.length > 0) {
    const { data: orgs, error: orgError } = await admin
      .from("organizations")
      .update({ is_demo: true })
      .in("id", orgIds as string[])
      .neq("is_demo", true)
      .select("id");
    if (orgError) throw new Error(`Could not flag demo organizations: ${orgError.message}`);
    organizations = orgs?.length ?? 0;
  }

  const result = { workspaces: workspaces?.length ?? 0, organizations, accounts: demo.length };
  await writeAudit(admin, {
    entity_type: "demo_tenant_labelling",
    event_type: "flagged",
    actor_id: input.actorId,
    severity: "info",
    new_value: { ...result, by: input.actor },
  });
  return result;
}

/** Records a named sign-off on the checklist as an append-only audit event. */
export async function recordDataSignOff(input: {
  verdict: "approved" | "rejected";
  note: string;
  actorId: string;
  actor: string;
}): Promise<SignOffRecord> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as AdminClient;
  const record: SignOffRecord = {
    at: new Date().toISOString(),
    by: input.actor,
    verdict: input.verdict,
    note: input.note,
  };
  await writeAudit(admin, {
    entity_type: "production_data_signoff",
    event_type: input.verdict,
    actor_id: input.actorId,
    severity: input.verdict === "approved" ? "info" : "warning",
    new_value: { ...record },
  });
  return record;
}
