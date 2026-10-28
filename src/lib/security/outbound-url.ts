/**
 * Outbound URL safety (SSRF guard) for server-side fetches to caller-influenced
 * endpoints (e.g. openai-compatible AI engine base URLs).
 *
 * Blocks link-local / metadata / private / loopback targets. Does not disable
 * legitimate public HTTPS providers.
 */

export type OutboundUrlDecision =
  | { ok: true; href: string }
  | { ok: false; reason: string };

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "instance-data",
]);

function isIpv4(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = m.slice(1).map((p) => Number(p));
  if (parts.some((n) => n > 255)) return null;
  return parts;
}

function isPrivateOrLocalIpv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  // IPv6 loopback / link-local / ULA
  if (host === "::1" || host === "[::1]") return true;
  if (host.startsWith("fe80:") || host.startsWith("[fe80:")) return true;
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("[fc") || host.startsWith("[fd")) {
    return true;
  }
  const v4 = isIpv4(host.replace(/^\[|\]$/g, ""));
  if (v4 && isPrivateOrLocalIpv4(v4)) return true;
  return false;
}

/**
 * Validate an outbound base URL before server-side fetch.
 * Requires https in all environments (http only when explicitly allowHttp).
 */
export function assertSafeOutboundUrl(
  raw: string | null | undefined,
  opts: { allowHttp?: boolean } = {},
): OutboundUrlDecision {
  if (raw == null || String(raw).trim() === "") {
    return { ok: false, reason: "empty_url" };
  }
  let url: URL;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "credentials_in_url_forbidden" };
  }
  if (url.protocol === "https:") {
    // ok
  } else if (url.protocol === "http:" && opts.allowHttp) {
    // ok when explicitly allowed (local lab only)
  } else {
    return { ok: false, reason: "https_required" };
  }
  if (isBlockedHostname(url.hostname)) {
    return { ok: false, reason: "private_or_metadata_host_forbidden" };
  }
  // Reject decimal/hex IP tricks that parse as public-looking hostnames poorly —
  // URL parser already normalizes most; block bare "0" style leftovers.
  if (/^\d+$/.test(url.hostname)) {
    return { ok: false, reason: "numeric_host_forbidden" };
  }
  return { ok: true, href: url.href.replace(/\/$/, "") };
}

/** Zod-friendly refine helper. */
export function safeOutboundUrlOrNull(
  value: string | null | undefined,
): string | null {
  if (value == null || value.trim() === "") return null;
  const decision = assertSafeOutboundUrl(value);
  if (!decision.ok) {
    throw new Error(`Unsafe outbound URL: ${decision.reason}`);
  }
  return decision.href;
}
