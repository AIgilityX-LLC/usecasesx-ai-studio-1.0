import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/launch-checks")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/launch-checks", replace: true });
  },
});
