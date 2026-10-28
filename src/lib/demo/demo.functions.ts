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

export const listDemoArtifactsFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { listDemoArtifacts, demoResetAuthorized } = await import("@/lib/demo/demo-reset.server");
    if (!demoResetAuthorized(data.password)) {
      throw new Error("Demonstration artifact inventory is not authorized in this environment.");
    }
    return listDemoArtifacts();
  });

/** Personas that actually exist in this environment (demonstration accounts only). */
export const listSeededPersonasFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { demoResetAuthorized } = await import("@/lib/demo/demo-reset.server");
    if (!demoResetAuthorized(data.password)) {
      throw new Error("Demonstration persona inventory is not authorized in this environment.");
    }
    const { listSeededPersonas } = await import("@/lib/demo/demo-personas.server");
    return listSeededPersonas();
  });

/** Resets every demonstration account to the known demonstration password. */
export const resetPersonaPasswordsFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { demoResetAuthorized } = await import("@/lib/demo/demo-reset.server");
    if (!demoResetAuthorized(data.password)) {
      throw new Error("Demonstration credential reset is not authorized in this environment.");
    }
    const { resetSeededPersonaPasswords } = await import("@/lib/demo/demo-personas.server");
    return resetSeededPersonaPasswords();
  });
