import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Dynamic OpenGraph/Twitter preview image for a public use case.
 *
 * Only template-only data is rendered: the published title, its primary
 * industry/capability labels and fixed product wording. No workspace,
 * customer or metric data is ever drawn onto a shareable image.
 */
export const Route = createFileRoute("/og/use-case/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { renderOgImage } = await import("@/lib/og-image.server");
        return renderOgImage(params.slug, new URL(request.url).origin);
      },
    },
  },
});
