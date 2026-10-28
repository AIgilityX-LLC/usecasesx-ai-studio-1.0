import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RequireCapability } from "@/components/RequireCapability";
import { RequirePlan } from "@/components/RequirePlan";
import { EnterpriseAdminChrome } from "@/components/enterprise-admin/EnterpriseAdminChrome";
import { EnterpriseAdminSidebar } from "@/components/enterprise-admin/EnterpriseAdminSidebar";
import { requireEnterpriseAdminAccessFn } from "@/lib/enterprise-admin/access.functions";

/**
 * Enterprise Administration Center — organization owners/admins.
 * Server beforeLoad + capability/plan gates. No auth decisions in leaf UI.
 */
export const Route = createFileRoute("/_app/enterprise-admin")({
  beforeLoad: async () => {
    try {
      await requireEnterpriseAdminAccessFn();
    } catch {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Enterprise Administration — UseCasesX™" },
      {
        name: "description",
        content:
          "Administer organization identity, residency, AI policy, workspaces, audit and support access.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EnterpriseAdminLayout,
});

function EnterpriseAdminLayout() {
  return (
    <RequirePlan min="pro" feature="Enterprise Administration Center">
      <RequireCapability capability="workspace.manage" action="open Enterprise Administration">
        <div className="flex min-h-0 flex-1 flex-col">
          <EnterpriseAdminChrome />
          <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
            <EnterpriseAdminSidebar />
            <main className="min-w-0 flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </RequireCapability>
    </RequirePlan>
  );
}
