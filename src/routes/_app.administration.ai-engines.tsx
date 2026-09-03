import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireRoles } from "@/components/RequireRoles";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";
import { AiEnginePanel } from "@/components/admin/AiEnginePanel";
import { WorkspaceEngineKeys } from "@/components/ai/WorkspaceEngineKeys";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/administration/ai-engines")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "AI Engines — UseCasesX™ Administration" },
      {
        name: "description",
        content:
          "Choose the research engines the AI Use Case Studio may use, set the default engine and manage provider API keys.",
      },
    ],
  }),
  component: AiEnginesPage,
});

function AiEnginesPage() {
  return (
    <RequireRoles anyOf={PLATFORM_ADMIN_ROLES} action="manage AI research engines">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Research engines</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Control which engines power the AI Use Case Studio — the built-in default or an
              external model reached with your own API key.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/administration">Back to administration</Link>
          </Button>
        </div>
        <AiEnginePanel />
        <WorkspaceEngineKeys />
      </div>
    </RequireRoles>
  );
}
