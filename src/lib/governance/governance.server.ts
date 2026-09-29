/**
 * Governance preview persistence + CyberX handoff (server-only).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyGovernanceFacts,
  GOVERNANCE_CONTENT_PACK_DATE,
  GOVERNANCE_CONTENT_PACK_SOURCE,
  GOVERNANCE_CONTENT_PACK_VERSION,
  GOVERNANCE_DISCLAIMER,
  governanceFactsSchema,
  mapFactsToThemes,
  type GovernanceFacts,
  type HandoffDeliveryStatus,
  type MappedTheme,
} from "./model";
import {
  buildCyberXPackage,
  CYBERX_CONSENT_STATEMENT,
  packageFileName,
  resolveCyberXDelivery,
  type CyberXHandoffContract,
} from "./package";
import { AUDIT_EVENTS } from "@/lib/telemetry/events";
import { writeAuditEvent } from "@/lib/telemetry/recorder.server";
import {
  buildConsent,
  buildSourceVersion,
  HANDOFF_TARGET_META,
  makeSourceRef,
  type HandoffConsent,
} from "@/lib/handoffs/handoff.model";

type Client = SupabaseClient<any, any, any>;

const SELECT =
  "id, use_case_id, organization_id, workspace_id, facts, mappings, content_pack_version, content_pack_date, content_pack_source, handoff_delivery_status, handoff_request_id, package_integrity_hash, package_generated_at, package_json, consent, created_by, created_at, updated_at";

export type GovernancePreview = {
  id: string;
  useCaseId: string;
  organizationId: string | null;
  workspaceId: string;
  facts: GovernanceFacts;
  mappings: MappedTheme[];
  contentPackVersion: string;
  contentPackDate: string;
  contentPackSource: string;
  handoffDeliveryStatus: HandoffDeliveryStatus;
  handoffRequestId: string | null;
  packageIntegrityHash: string | null;
  packageGeneratedAt: string | null;
  packageJson: CyberXHandoffContract | null;
  consent: HandoffConsent | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  disclaimer: string;
};

function rowToPreview(row: Record<string, unknown>): GovernancePreview {
  const facts = emptyGovernanceFacts(
    governanceFactsSchema.partial().parse(row.facts ?? {}),
  );
  return {
    id: String(row.id),
    useCaseId: String(row.use_case_id),
    organizationId: (row.organization_id as string) ?? null,
    workspaceId: String(row.workspace_id),
    facts,
    mappings: Array.isArray(row.mappings) ? (row.mappings as MappedTheme[]) : [],
    contentPackVersion: String(row.content_pack_version),
    contentPackDate: String(row.content_pack_date),
    contentPackSource: String(row.content_pack_source),
    handoffDeliveryStatus: row.handoff_delivery_status as HandoffDeliveryStatus,
    handoffRequestId: (row.handoff_request_id as string) ?? null,
    packageIntegrityHash: (row.package_integrity_hash as string) ?? null,
    packageGeneratedAt: (row.package_generated_at as string) ?? null,
    packageJson: (row.package_json as CyberXHandoffContract) ?? null,
    consent: (row.consent as HandoffConsent) ?? null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    disclaimer: GOVERNANCE_DISCLAIMER,
  };
}

async function loadUseCase(
  supabase: Client,
  useCaseId: string,
): Promise<{
  id: string;
  title: string;
  workspaceId: string;
  organizationId: string | null;
  status: string | null;
  currentVersionId: string | null;
}> {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .select("id, title, workspace_id, organization_id, status, version")
    .eq("id", useCaseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.workspace_id) throw new Error("Use case not found or has no workspace.");
  return {
    id: String(data.id),
    title: String(data.title),
    workspaceId: String(data.workspace_id),
    organizationId: (data.organization_id as string) ?? null,
    status: (data.status as string) ?? null,
    currentVersionId: data.version != null ? String(data.version) : null,
  };
}

export async function getGovernancePreview(
  supabase: Client,
  useCaseId: string,
): Promise<GovernancePreview | null> {
  const { data, error } = await supabase
    .from("use_case_governance_previews")
    .select(SELECT)
    .eq("use_case_id", useCaseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToPreview(data as Record<string, unknown>);
}

export async function saveGovernancePreview(
  supabase: Client,
  userId: string,
  useCaseId: string,
  factsRaw: unknown,
): Promise<GovernancePreview> {
  const facts = emptyGovernanceFacts(governanceFactsSchema.parse(factsRaw));
  const mappings = mapFactsToThemes(facts);
  const uc = await loadUseCase(supabase, useCaseId);

  const payload = {
    use_case_id: uc.id,
    organization_id: uc.organizationId,
    workspace_id: uc.workspaceId,
    facts,
    mappings,
    content_pack_version: GOVERNANCE_CONTENT_PACK_VERSION,
    content_pack_date: GOVERNANCE_CONTENT_PACK_DATE,
    content_pack_source: GOVERNANCE_CONTENT_PACK_SOURCE,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const existing = await getGovernancePreview(supabase, useCaseId);
  let row: Record<string, unknown>;
  if (existing) {
    const { data, error } = await supabase
      .from("use_case_governance_previews")
      .update({
        facts: payload.facts,
        mappings: payload.mappings,
        content_pack_version: payload.content_pack_version,
        content_pack_date: payload.content_pack_date,
        content_pack_source: payload.content_pack_source,
      })
      .eq("id", existing.id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    row = data as Record<string, unknown>;
  } else {
    const { data, error } = await supabase
      .from("use_case_governance_previews")
      .insert(payload)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    row = data as Record<string, unknown>;
  }

  const preview = rowToPreview(row);
  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: preview.organizationId, workspaceId: preview.workspaceId },
    },
    {
      event: AUDIT_EVENTS.entityUpdated,
      entity: { type: "governance_preview", id: preview.id },
      next: {
        useCaseId: preview.useCaseId,
        contentPackVersion: preview.contentPackVersion,
        mappingCount: preview.mappings.length,
      },
    },
  );
  return preview;
}

/**
 * Consented CyberX handoff. If CYBERX_C3G_HANDOFF_URL is unset, produce a
 * downloadable signed-context package + queue the suite handoff — never claim sync.
 */
export async function handoffToCyberX(
  supabase: Client,
  userId: string,
  input: {
    useCaseId: string;
    consentConfirmed: boolean;
  },
): Promise<{
  preview: GovernancePreview;
  package: CyberXHandoffContract;
  fileName: string;
  message: string;
  synchronized: false | true;
}> {
  if (!input.consentConfirmed) {
    throw new Error("Explicit consent is required before a CyberX C3G/SARN handoff.");
  }

  const preview = await getGovernancePreview(supabase, input.useCaseId);
  if (!preview) {
    throw new Error("Save the Governance Readiness preview before requesting a handoff.");
  }

  const uc = await loadUseCase(supabase, input.useCaseId);
  const endpointUrl = (process.env.CYBERX_C3G_HANDOFF_URL ?? "").trim();
  const delivery = resolveCyberXDelivery(Boolean(endpointUrl));

  // Even if an endpoint URL is set, we do not pretend success without a real call.
  // Ponytail: no live CyberX client yet — always package + queue unless a future
  // transport is wired. Force unavailable path when no transport exists.
  const honest = resolveCyberXDelivery(false);

  const consentAt = new Date().toISOString();
  const pkg = buildCyberXPackage({
    organizationId: uc.organizationId,
    workspaceId: uc.workspaceId,
    useCase: {
      id: uc.id,
      title: uc.title,
      recordVersionId: uc.currentVersionId,
      status: uc.status,
    },
    facts: preview.facts,
    consentConfirmed: true,
    consentConfirmedAt: consentAt,
    deliveryStatus: honest.status,
  });

  const sourceRefs = [
    makeSourceRef({
      type: "use_case",
      id: uc.id,
      label: uc.title,
      version: uc.currentVersionId,
    }),
    makeSourceRef({
      type: "governance_preview",
      id: preview.id,
      label: "Governance Readiness preview",
      version: preview.contentPackVersion,
    }),
  ];
  const sourceVersion = buildSourceVersion(sourceRefs);
  const consent = buildConsent({
    target: "sarn_c3g",
    requestType: "governance_gate",
    title: `Governance handoff: ${uc.title}`,
    summary: GOVERNANCE_DISCLAIMER,
    payload: {},
    consentConfirmed: true,
    sourceRefs,
  });
  // Override statement to CyberX-specific consent
  consent.statement = CYBERX_CONSENT_STATEMENT;
  consent.confirmedAt = consentAt;

  const { data: handoffRow, error: handoffErr } = await supabase
    .from("suite_handoff_requests")
    .insert({
      workspace_id: uc.workspaceId,
      organization_id: uc.organizationId,
      target: "sarn_c3g",
      request_type: "governance_gate",
      status: "queued",
      delivery_mode: "internal_queue",
      title: `Governance handoff: ${uc.title}`,
      summary: honest.message,
      requested_by: userId,
      subject_refs: sourceRefs,
      source_version: sourceVersion,
      payload: {
        contractVersion: pkg.contractVersion,
        integrityHash: pkg.integrityHash,
        deliveryStatus: honest.status,
        governancePreviewId: preview.id,
      },
      consent,
      sensitivity: HANDOFF_TARGET_META.sarn_c3g.sensitivity,
    })
    .select("id")
    .single();
  if (handoffErr) throw new Error(handoffErr.message);

  const { data: updated, error: updErr } = await supabase
    .from("use_case_governance_previews")
    .update({
      handoff_delivery_status: honest.status,
      handoff_request_id: (handoffRow as { id: string }).id,
      package_integrity_hash: pkg.integrityHash,
      package_generated_at: pkg.generatedAt,
      package_json: pkg,
      consent,
    })
    .eq("id", preview.id)
    .select(SELECT)
    .single();
  if (updErr) throw new Error(updErr.message);

  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: uc.organizationId, workspaceId: uc.workspaceId },
    },
    {
      event: AUDIT_EVENTS.handoffRequested,
      entity: { type: "governance_preview", id: preview.id },
      next: {
        target: "sarn_c3g",
        deliveryStatus: honest.status,
        synchronized: false,
        integrityHash: pkg.integrityHash,
        handoffRequestId: (handoffRow as { id: string }).id,
        endpointConfigured: Boolean(endpointUrl),
        // Never log package body / personal facts in audit
      },
    },
  );

  void delivery; // reserved when CyberX transport is wired

  return {
    preview: rowToPreview(updated as Record<string, unknown>),
    package: pkg,
    fileName: packageFileName(uc.id, pkg.generatedAt),
    message: honest.message,
    synchronized: false,
  };
}
