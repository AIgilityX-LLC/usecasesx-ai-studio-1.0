import { createEmailWebhookHandler } from "@lovable.dev/email-js";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Managed-delivery outcome receiver.
 *
 * Bounces, spam complaints and unsubscribes update the matching lead's
 * confirmation status and timeline so the admin pipeline reflects reality.
 * Suppression itself is enforced by the platform at send time — nothing here
 * gates future sends.
 */
export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          console.error("Missing required environment variables");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const apply = async (
          event: "email.bounced" | "email.complaint" | "email.unsubscribed",
          recipient: string,
          eventId: string,
        ) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { applyDeliveryEvent } = await import("@/lib/leads/email-health.server");
          const result = await applyDeliveryEvent(supabaseAdmin, { event, recipient, eventId });
          console.log("[email-events] processed", { event, event_id: eventId, ...result });
        };

        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            "email.bounced": async (event) => {
              await apply("email.bounced", event.data.recipient, event.event_id);
            },
            "email.complaint": async (event) => {
              await apply("email.complaint", event.data.recipient, event.event_id);
            },
            "email.unsubscribed": async (event) => {
              await apply("email.unsubscribed", event.data.recipient, event.event_id);
            },
          },
        });
        return handler(request);
      },
    },
  },
});
