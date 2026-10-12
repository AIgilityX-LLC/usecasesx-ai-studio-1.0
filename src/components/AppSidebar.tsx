/**
 * Signed-in sidebar entry. Selects classic vs enterprise chrome via
 * `PUBLIC_LAUNCH_FEATURES.enterpriseNavigationV2` (`VITE_ENTERPRISE_NAVIGATION_V2_ENABLED`).
 * Routes stay shared — only chrome differs. See docs/releases/enterprise-navigation-v2-rollout.md.
 */
import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { PUBLIC_LAUNCH_FEATURES } from "@/lib/feature-flags";
import { ClassicAppSidebar } from "@/components/ClassicAppSidebar";
import { EnterpriseSidebar } from "@/components/enterprise-nav";
import { trackNavRenderError, trackNavVariantActive } from "@/lib/telemetry/navigation-analytics";

export function AppSidebar() {
  if (!PUBLIC_LAUNCH_FEATURES.enterpriseNavigationV2) {
    return <ClassicSidebarWithTelemetry />;
  }

  return (
    <EnterpriseNavBoundary>
      <EnterpriseSidebar />
    </EnterpriseNavBoundary>
  );
}

function ClassicSidebarWithTelemetry() {
  useEffect(() => {
    trackNavVariantActive("classic");
  }, []);
  return <ClassicAppSidebar />;
}

/**
 * If enterprise chrome throws, fall back to classic nav and emit a product event.
 * Env-flag OFF remains the primary rollback; this is an in-session safety net.
 */
class EnterpriseNavBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    trackNavRenderError(error);
  }

  componentDidMount(): void {
    if (!this.state.failed) trackNavVariantActive("enterprise_v2");
  }

  render(): ReactNode {
    if (this.state.failed) {
      return <ClassicAppSidebar />;
    }
    return this.props.children;
  }
}
