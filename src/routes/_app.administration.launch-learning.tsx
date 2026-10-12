import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/launch-learning")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/launch-learning", replace: true });
  },
});
