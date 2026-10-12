import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/release-candidate")({
  beforeLoad: () => {
    throw redirect({ to: "/platform-admin/release-candidate", replace: true });
  },
});
