import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { PlatformAdminChrome } from "@/components/platform-admin/PlatformAdminChrome";
import { requirePlatformAdminFn } from "@/lib/admin/require-platform-admin.functions";

/**
 * AIgilityX Platform Administration layout.
 * Server beforeLoad + client RequireRoles — UI visibility is never the only gate.
 */
export const Route = createFileRoute("/_app/platform-admin")({
  beforeLoad: async () => {
    try {
      await requirePlatformAdminFn();
    } catch {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Platform Administration" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformAdminLayout,
});

function PlatformAdminLayout() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="open AIgilityX platform administration">
      <div className="flex min-h-0 flex-1 flex-col">
        <PlatformAdminChrome />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </RequireRoles>
  );
}
