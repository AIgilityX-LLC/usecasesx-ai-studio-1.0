/**
 * Lead pipeline model — pure helpers shared by the admin dashboard, the CSV
 * export and the reporting counts. No IO here so every rule is unit-testable.
 */

export const LEAD_STATUSES = ["new", "contacted", "converted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Confirmation-email delivery states tracked per lead. */
export const DELIVERY_STATUSES = ["pending", "sent", "failed", "suppressed", "skipped"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export function normalizeDeliveryStatus(value: string | null | undefined): DeliveryStatus {
  const v = (value ?? "").toLowerCase();
  return (DELIVERY_STATUSES as readonly string[]).includes(v) ? (v as DeliveryStatus) : "pending";
}

/**
 * Retry schedule for confirmation emails. Delivery is retried with capped
 * exponential backoff (5m, 15m, 45m, 2h15m, 6h45m) and abandoned after five
 * attempts so a permanently bad address cannot be retried forever.
 */
export const MAX_DELIVERY_ATTEMPTS = 5;

export function retryDelayMinutes(attempts: number): number {
  return 5 * 3 ** Math.max(0, Math.min(attempts - 1, 4));
}

export function nextRetryAt(attempts: number, from: Date = new Date()): string | null {
  if (attempts >= MAX_DELIVERY_ATTEMPTS) return null;
  return new Date(from.getTime() + retryDelayMinutes(attempts) * 60_000).toISOString();
}

/** True when this lead's confirmation email is due for another attempt. */
export function isRetryDue(
  lead: Pick<
    LeadRecord,
    "confirmation_status" | "confirmation_attempts" | "confirmation_next_retry_at"
  >,
  now: Date = new Date(),
): boolean {
  const status = normalizeDeliveryStatus(lead.confirmation_status);
  if (status !== "pending" && status !== "failed") return false;
  if ((lead.confirmation_attempts ?? 0) >= MAX_DELIVERY_ATTEMPTS) return false;
  if (!lead.confirmation_next_retry_at) return true;
  return new Date(lead.confirmation_next_retry_at).getTime() <= now.getTime();
}

/** CTA values written by the two footer conversion flows. */
export const WAITLIST_CTAS = ["waitlist", "founding-access", "free-pro", "lite-pdf"] as const;
export const ADVISOR_CTAS = ["ai-strategy-session", "advisor", "contact"] as const;

export type LeadChannel = "waitlist" | "advisor" | "other";

export interface LeadRecord {
  id: string;
  reference_id: string | null;
  full_name: string;
  email: string;
  company: string | null;
  country: string | null;
  interest_area: string | null;
  cta: string | null;
  source_page: string | null;
  lead_status: string;
  waitlist_status: string;
  eligible: boolean | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_host: string | null;
  created_at: string;
  confirmation_status: string | null;
  confirmation_attempts: number | null;
  confirmation_last_attempt_at: string | null;
  confirmation_sent_at: string | null;
  confirmation_next_retry_at: string | null;
  confirmation_last_error: string | null;
}

/** One append-only entry in a lead's activity timeline. */
export interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_id: string | null;
  actor_label: string | null;
  detail: string | null;
  correlation_id: string | null;
  created_at: string;
}

/** Normalizes the free-form CTA into the two marketing channels we report on. */
export function leadChannel(cta: string | null | undefined): LeadChannel {
  const value = (cta ?? "").toLowerCase();
  if (!value) return "other";
  if (ADVISOR_CTAS.some((c) => value.includes(c))) return "advisor";
  if (WAITLIST_CTAS.some((c) => value.includes(c))) return "waitlist";
  return "other";
}

export function normalizeLeadStatus(value: string | null | undefined): LeadStatus {
  const v = (value ?? "").toLowerCase();
  return (LEAD_STATUSES as readonly string[]).includes(v) ? (v as LeadStatus) : "new";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface DedupedLead extends LeadRecord {
  /** How many raw submissions share this work email. */
  submissions: number;
  /** Every distinct channel this person came through. */
  channels: LeadChannel[];
  duplicateIds: string[];
}

/**
 * Collapses repeat submissions from the same work email into one row: the most
 * recent submission wins, and the furthest-along status is kept so a converted
 * lead is never displayed as new again.
 */
export function dedupeByEmail(leads: LeadRecord[]): DedupedLead[] {
  const rank: Record<LeadStatus, number> = { new: 0, contacted: 1, converted: 2 };
  const groups = new Map<string, LeadRecord[]>();
  for (const lead of leads) {
    const key = normalizeEmail(lead.email);
    const bucket = groups.get(key);
    if (bucket) bucket.push(lead);
    else groups.set(key, [lead]);
  }

  const out: DedupedLead[] = [];
  for (const bucket of groups.values()) {
    const sorted = [...bucket].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const primary = sorted[0]!;
    const best = sorted.reduce((acc, lead) =>
      rank[normalizeLeadStatus(lead.lead_status)] > rank[normalizeLeadStatus(acc.lead_status)]
        ? lead
        : acc,
    );
    const channels = Array.from(new Set(sorted.map((l) => leadChannel(l.cta))));
    out.push({
      ...primary,
      lead_status: normalizeLeadStatus(best.lead_status),
      submissions: sorted.length,
      channels,
      duplicateIds: sorted.slice(1).map((l) => l.id),
    });
  }
  return out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export interface LeadFilters {
  query?: string;
  channel?: LeadChannel | "all";
  status?: LeadStatus | "all";
  campaign?: string | "all";
}

export function filterLeads<T extends LeadRecord>(leads: T[], filters: LeadFilters): T[] {
  const term = (filters.query ?? "").trim().toLowerCase();
  return leads.filter((lead) => {
    if (filters.channel && filters.channel !== "all" && leadChannel(lead.cta) !== filters.channel)
      return false;
    if (
      filters.status &&
      filters.status !== "all" &&
      normalizeLeadStatus(lead.lead_status) !== filters.status
    )
      return false;
    if (filters.campaign && filters.campaign !== "all") {
      const campaign = lead.utm_campaign ?? lead.utm_source ?? lead.referrer_host ?? "direct";
      if (campaign !== filters.campaign) return false;
    }
    if (term) {
      const haystack = [lead.full_name, lead.email, lead.company, lead.reference_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

export interface ConversionCounts {
  total: number;
  uniqueEmails: number;
  byStatus: Record<LeadStatus, number>;
  byChannel: Record<LeadChannel, number>;
  /** Conversions grouped by first-touch campaign / source / referrer. */
  byCampaign: { campaign: string; leads: number; converted: number }[];
  conversionRate: number;
}

export function campaignLabel(lead: LeadRecord): string {
  return lead.utm_campaign ?? lead.utm_source ?? lead.referrer_host ?? "direct";
}

export function conversionCounts(leads: LeadRecord[]): ConversionCounts {
  const byStatus: Record<LeadStatus, number> = { new: 0, contacted: 0, converted: 0 };
  const byChannel: Record<LeadChannel, number> = { waitlist: 0, advisor: 0, other: 0 };
  const campaigns = new Map<string, { leads: number; converted: number }>();
  const emails = new Set<string>();

  for (const lead of leads) {
    const status = normalizeLeadStatus(lead.lead_status);
    byStatus[status] += 1;
    byChannel[leadChannel(lead.cta)] += 1;
    emails.add(normalizeEmail(lead.email));
    const key = campaignLabel(lead);
    const entry = campaigns.get(key) ?? { leads: 0, converted: 0 };
    entry.leads += 1;
    if (status === "converted") entry.converted += 1;
    campaigns.set(key, entry);
  }

  return {
    total: leads.length,
    uniqueEmails: emails.size,
    byStatus,
    byChannel,
    byCampaign: Array.from(campaigns.entries())
      .map(([campaign, v]) => ({ campaign, ...v }))
      .sort((a, b) => b.leads - a.leads),
    conversionRate: leads.length === 0 ? 0 : byStatus.converted / leads.length,
  };
}

/** Column groups the admin can toggle before exporting. */
export interface CsvExportOptions {
  /** Reference code + submission count columns. */
  reference?: boolean;
  /** UTM source/medium/campaign, referrer and landing page. */
  attribution?: boolean;
  /** Derived campaign label plus per-campaign lead/conversion totals. */
  campaignBreakdown?: boolean;
  /** Confirmation-email delivery status columns. */
  delivery?: boolean;
}

export const DEFAULT_CSV_OPTIONS: CsvExportOptions = {
  reference: true,
  attribution: true,
  campaignBreakdown: false,
  delivery: true,
};

const BASE_HEADERS = [
  "created_at",
  "full_name",
  "email",
  "company",
  "country",
  "channel",
  "cta",
  "interest_area",
  "lead_status",
  "waitlist_status",
  "eligible",
] as const;
const REFERENCE_HEADERS = ["reference_id", "submissions"] as const;
const ATTRIBUTION_HEADERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "referrer_host",
  "source_page",
] as const;
const CAMPAIGN_HEADERS = ["campaign", "campaign_leads", "campaign_converted"] as const;
const DELIVERY_HEADERS = [
  "confirmation_status",
  "confirmation_attempts",
  "confirmation_sent_at",
  "confirmation_last_error",
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Neutralize spreadsheet formula injection before quoting.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvHeaders(options: CsvExportOptions = DEFAULT_CSV_OPTIONS): string[] {
  return [
    ...(options.reference ? REFERENCE_HEADERS : []),
    ...BASE_HEADERS,
    ...(options.attribution ? ATTRIBUTION_HEADERS : []),
    ...(options.campaignBreakdown ? CAMPAIGN_HEADERS : []),
    ...(options.delivery ? DELIVERY_HEADERS : []),
  ];
}

export function leadsToCsv(
  leads: (LeadRecord & { submissions?: number })[],
  options: CsvExportOptions = DEFAULT_CSV_OPTIONS,
): string {
  const campaigns = new Map(conversionCounts(leads).byCampaign.map((c) => [c.campaign, c]));
  const rows = leads.map((lead) => {
    const campaign = campaignLabel(lead);
    const totals = campaigns.get(campaign);
    return [
      ...(options.reference ? [lead.reference_id, lead.submissions ?? 1] : []),
      lead.created_at,
      lead.full_name,
      lead.email,
      lead.company,
      lead.country,
      leadChannel(lead.cta),
      lead.cta,
      lead.interest_area,
      normalizeLeadStatus(lead.lead_status),
      lead.waitlist_status,
      lead.eligible,
      ...(options.attribution
        ? [
            lead.utm_source,
            lead.utm_medium,
            lead.utm_campaign,
            lead.referrer_host,
            lead.source_page,
          ]
        : []),
      ...(options.campaignBreakdown ? [campaign, totals?.leads ?? 0, totals?.converted ?? 0] : []),
      ...(options.delivery
        ? [
            normalizeDeliveryStatus(lead.confirmation_status),
            lead.confirmation_attempts ?? 0,
            lead.confirmation_sent_at,
            lead.confirmation_last_error,
          ]
        : []),
    ]
      .map(csvCell)
      .join(",");
  });
  return [csvHeaders(options).join(","), ...rows].join("\n");
}
