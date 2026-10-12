import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/readiness/")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/readiness", replace: true });
  },
});
