import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/production-data")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/production-data", replace: true });
  },
});
