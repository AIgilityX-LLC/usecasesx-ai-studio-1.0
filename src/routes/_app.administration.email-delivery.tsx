import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/email-delivery")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/email-delivery", replace: true });
  },
});
