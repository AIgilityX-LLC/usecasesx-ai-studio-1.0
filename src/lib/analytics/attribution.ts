/**
 * Safe campaign / source attribution.
 *
 * First-touch UTM parameters and the referring host are captured once per
 * browser session and attached to activity events. Values are allow-listed,
 * lower-cased and truncated: no query strings, no paths, no user content and
 * nothing that could carry personal data is ever stored.
 */

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerHost: string | null;
}

export const EMPTY_ATTRIBUTION: Attribution = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  referrerHost: null,
};

const STORAGE_KEY = "usecasex_attribution";
const MAX_LEN = 60;

/** Keeps only campaign-shaped tokens; anything else is discarded. */
export function sanitizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\-. ]/g, "")
    .slice(0, MAX_LEN)
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeHost(referrer: string, currentHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (!host || host === currentHost.toLowerCase()) return null; // internal navigation
    return host.slice(0, MAX_LEN);
  } catch {
    return null;
  }
}

/** Reads campaign parameters from a URL search string. */
export function parseAttribution(search: string, referrer: string, host: string): Attribution {
  const params = new URLSearchParams(search);
  return {
    utmSource: sanitizeToken(params.get("utm_source")),
    utmMedium: sanitizeToken(params.get("utm_medium")),
    utmCampaign: sanitizeToken(params.get("utm_campaign")),
    referrerHost: sanitizeHost(referrer, host),
  };
}

function isEmpty(attribution: Attribution): boolean {
  return (
    !attribution.utmSource &&
    !attribution.utmMedium &&
    !attribution.utmCampaign &&
    !attribution.referrerHost
  );
}

/**
 * Captures first-touch attribution for the session. Later page views never
 * overwrite an existing value, so the original campaign stays attributable.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY_ATTRIBUTION;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) return { ...EMPTY_ATTRIBUTION, ...(JSON.parse(stored) as Attribution) };
    const fresh = parseAttribution(
      window.location.search,
      document.referrer ?? "",
      window.location.hostname,
    );
    if (!isEmpty(fresh)) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return EMPTY_ATTRIBUTION;
  }
}

export function getAttribution(): Attribution {
  return captureAttribution();
}

/**
 * Search terms are product signal, not user content: anything that looks like
 * an identifier (email, long free text, URLs) is dropped before storage.
 */
export function sanitizeSearchQuery(query: string): string | null {
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return null;
  if (/@|https?:\/\//i.test(trimmed)) return null;
  if (/\d{6,}/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}
