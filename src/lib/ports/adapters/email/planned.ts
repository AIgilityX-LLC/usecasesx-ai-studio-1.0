import {
  EMAIL_ADAPTER_CATALOGUE,
  type EmailPort,
  type EmailProviderId,
} from "@/lib/ports/email.port";

function planned(id: Exclude<EmailProviderId, "lovable_email">): EmailPort {
  return {
    meta: { ...EMAIL_ADAPTER_CATALOGUE[id], port: "email" },
    async sendTemplate() {
      return { sent: false, reason: "not_implemented" };
    },
  };
}

export const smtpRelayAdapter = planned("smtp_relay");
export const resendAdapter = planned("resend");
export const offlineQueueAdapter = planned("offline_queue");
