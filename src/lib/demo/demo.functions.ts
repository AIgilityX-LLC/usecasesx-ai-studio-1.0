/**
 * Demo tenant server functions — thin wrappers only (AGENTS.md §3).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const resetDemoTenantsFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { resetDemoTenants, demoResetAuthorized } = await import("@/lib/demo/demo-reset.server");
    if (!demoResetAuthorized(data.password)) {
      throw new Error("Demo reset is not authorized in this environment.");
    }
    return resetDemoTenants();
  });

export const listDemoArtifactsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listDemoArtifacts } = await import("@/lib/demo/demo-reset.server");
  return listDemoArtifacts();
});
