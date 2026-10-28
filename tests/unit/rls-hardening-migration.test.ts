import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20261028180000_rls_telemetry_and_role_hardening.sql",
  ),
  "utf8",
);

describe("RLS hardening migration (written, not applied)", () => {
  it("restricts user_roles management to super_admin", () => {
    expect(migration).toContain("Super admins manage roles");
    expect(migration).toContain("super_admin");
    expect(migration).toContain('DROP POLICY IF EXISTS "Admins manage roles"');
  });

  it("replaces unrestricted telemetry inserts", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Anyone log view"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Anyone log download"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Anyone log integration event"');
    expect(migration).toMatch(/user_id IS NULL[\s\S]*user_id = auth\.uid\(\)/);
  });

  it("is additive (no DROP TABLE)", () => {
    expect(migration.toUpperCase()).not.toContain("DROP TABLE");
    expect(migration.toUpperCase()).not.toContain("DROP COLUMN");
  });
});
