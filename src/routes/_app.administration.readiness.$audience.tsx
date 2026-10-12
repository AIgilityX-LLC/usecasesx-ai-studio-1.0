import { createFileRoute, redirect } from "@tanstack/react-router";
import type { ReadinessAudience } from "@/lib/release/readiness";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/readiness/$audience")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/platform-admin/readiness/$audience",
      params: { audience: params.audience as ReadinessAudience },
      replace: true,
    });
  },
});
