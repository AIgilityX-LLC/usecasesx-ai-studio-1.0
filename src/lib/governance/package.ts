/**
 * Versioned CyberX C3G/SARN outbound handoff contract + signed-context package.
 * Integrity hash is a content fingerprint — not a cryptographic signature with a private key.
 */

import {
  confirmedFacts,
  GOVERNANCE_CONTENT_PACK_DATE,
  GOVERNANCE_CONTENT_PACK_SOURCE,
  GOVERNANCE_CONTENT_PACK_VERSION,
  GOVERNANCE_DISCLAIMER,
  mapFactsToThemes,
  type GovernanceFacts,
  type HandoffDeliveryStatus,
  type MappedTheme,
} from "./model";

export const CYBERX_HANDOFF_CONTRACT_VERSION = "1.0.0";

export type CyberXHandoffContract = {
  contractVersion: string;
  generatedAt: string;
  disclaimer: string;
  contentPack: {
    version: string;
    date: string;
    source: string;
  };
  tenant: {
    organizationId: string | null;
    workspaceId: string;
  };
  useCase: {
    id: string;
    title: string;
    recordVersionId: string | null;
    status: string | null;
  };
  consent: {
    confirmed: boolean;
    confirmedAt: string | null;
    statement: string;
  };
  facts: Partial<GovernanceFacts>;
  mappings: MappedTheme[];
  evidenceRefs: { id: string; label: string }[];
  deliveryStatus: HandoffDeliveryStatus;
  /** Hex integrity fingerprint of the package body (excluding this field). */
  integrityHash: string;
};

export const CYBERX_CONSENT_STATEMENT =
  "I confirm this workspace context — including the Governance Readiness preview, use-case snapshot references and evidence references listed — may be shared with CyberX C3G/SARN for governance, risk and assurance review. I understand authoritative determinations are made in CyberX, not in UseCasesX.";

/** FNV-1a 32-bit hex — stable, dependency-free content fingerprint. */
export function integrityHashOf(canonical: string): string {
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildCyberXPackage(input: {
  organizationId: string | null;
  workspaceId: string;
  useCase: { id: string; title: string; recordVersionId?: string | null; status?: string | null };
  facts: GovernanceFacts;
  consentConfirmed: boolean;
  consentConfirmedAt?: string | null;
  evidenceRefs?: { id: string; label: string }[];
  deliveryStatus: HandoffDeliveryStatus;
}): CyberXHandoffContract {
  const mappings = mapFactsToThemes(input.facts);
  const body = {
    contractVersion: CYBERX_HANDOFF_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    disclaimer: GOVERNANCE_DISCLAIMER,
    contentPack: {
      version: GOVERNANCE_CONTENT_PACK_VERSION,
      date: GOVERNANCE_CONTENT_PACK_DATE,
      source: GOVERNANCE_CONTENT_PACK_SOURCE,
    },
    tenant: {
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
    },
    useCase: {
      id: input.useCase.id,
      title: input.useCase.title,
      recordVersionId: input.useCase.recordVersionId ?? null,
      status: input.useCase.status ?? null,
    },
    consent: {
      confirmed: input.consentConfirmed,
      confirmedAt: input.consentConfirmed
        ? (input.consentConfirmedAt ?? new Date().toISOString())
        : null,
      statement: CYBERX_CONSENT_STATEMENT,
    },
    facts: confirmedFacts(input.facts),
    mappings,
    evidenceRefs: input.evidenceRefs ?? [],
    deliveryStatus: input.deliveryStatus,
  };

  const canonical = JSON.stringify(body);
  return {
    ...body,
    integrityHash: integrityHashOf(canonical),
  };
}

export function packageFileName(useCaseId: string, generatedAt: string): string {
  const day = generatedAt.slice(0, 10);
  return `cyberx-c3g-context-${useCaseId.slice(0, 8)}-${day}.json`;
}

/**
 * Resolve delivery when attempting CyberX handoff.
 * Endpoint URL from env — if missing/unreachable path: package + queue, never "synced".
 */
export function resolveCyberXDelivery(endpointConfigured: boolean): {
  status: HandoffDeliveryStatus;
  deliveryMode: "endpoint" | "internal_queue" | "package_download";
  message: string;
} {
  if (endpointConfigured) {
    return {
      status: "endpoint_delivered",
      deliveryMode: "endpoint",
      message: "Delivered to the configured CyberX C3G endpoint.",
    };
  }
  return {
    status: "package_ready",
    deliveryMode: "package_download",
    message:
      "CyberX C3G endpoint is not configured. A signed-context package is ready to download, and the request is queued for human pickup. Synchronization has not occurred.",
  };
}
