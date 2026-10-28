/**
 * Email port — transactional / template delivery without naming a vendor.
 */

import type { AdapterMeta } from "./types";

export const EMAIL_PROVIDER_IDS = ["lovable_email", "smtp_relay", "resend", "offline_queue"] as const;
export type EmailProviderId = (typeof EMAIL_PROVIDER_IDS)[number];

export type EmailSendRequest = {
  templateName: string;
  to: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
  replyTo?: string;
  from?: string;
};

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "recipient_suppressed" | "not_configured" | "not_implemented" };

export type EmailPort = {
  readonly meta: AdapterMeta & { port: "email"; id: EmailProviderId };
  sendTemplate(req: EmailSendRequest): Promise<EmailSendResult>;
};

export const EMAIL_ADAPTER_CATALOGUE: Record<
  EmailProviderId,
  Omit<AdapterMeta, "port"> & { id: EmailProviderId }
> = {
  lovable_email: {
    id: "lovable_email",
    label: "Lovable Email",
    status: "active",
    implementation: "src/lib/email-templates/send-email.ts → ports/adapters/email/lovable.adapter.ts",
  },
  smtp_relay: {
    id: "smtp_relay",
    label: "SMTP Relay",
    status: "planned",
    implementation: "src/lib/ports/adapters/email/planned.ts",
    notes: "Private / air-gap candidate.",
  },
  resend: {
    id: "resend",
    label: "Resend",
    status: "planned",
    implementation: "src/lib/ports/adapters/email/planned.ts",
  },
  offline_queue: {
    id: "offline_queue",
    label: "Offline Queue",
    status: "planned",
    implementation: "src/lib/ports/adapters/email/planned.ts",
  },
};
