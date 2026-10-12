import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/admin-waitlist")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/waitlist", replace: true });
  },
});
