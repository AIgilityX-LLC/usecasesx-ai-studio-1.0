import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/admin-audit")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/submission-audit", replace: true });
  },
});
