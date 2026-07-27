/**
 * RLS checks for the organization-unit + taxonomy model.
 * Run with: bun tests/org-taxonomy-rls.e2e.ts
 *
 * Anonymous expectations:
 *  - published GLOBAL taxonomy rows are readable
 *  - tenant-private rows are never readable
 *  - writes are always rejected
 *  - organization_units are never readable
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const anon = createClient(url, key, { auth: { persistSession: false } });

const TAXONOMY = [
  "taxonomy_processes",
  "taxonomy_strategic_themes",
  "taxonomy_value_themes",
  "taxonomy_risk_levels",
  "taxonomy_lifecycle_stages",
] as const;

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

for (const table of TAXONOMY) {
  const { data, error } = await anon.from(table as never).select("id, name, organization_id");
  check(`${table}: anon can read global entries`, !error && (data?.length ?? 0) > 0, error?.message ?? "");
  const leaked = (data ?? []).filter((r: any) => r.organization_id != null);
  check(`${table}: anon sees no tenant-private entries`, leaked.length === 0, `${leaked.length} leaked`);

  const { error: writeError } = await anon
    .from(table as never)
    .insert({ slug: `rls-probe-${Date.now()}`, name: "RLS probe" } as never);
  check(`${table}: anon write rejected`, !!writeError, writeError ? "" : "insert succeeded");
}

const { data: units, error: unitErr } = await anon
  .from("organization_units" as never)
  .select("id");
check(
  "organization_units: anon sees nothing",
  (units?.length ?? 0) === 0 || !!unitErr,
  unitErr?.message ?? `${units?.length ?? 0} rows`,
);

for (const table of ["ai_use_case_org_units", "ai_use_case_processes", "ai_use_case_strategic_themes", "ai_use_case_value_themes"] as const) {
  const { data, error } = await anon.from(table as never).select("use_case_id");
  check(`${table}: anon sees nothing`, (data?.length ?? 0) === 0 || !!error, error?.message ?? `${data?.length ?? 0} rows`);
}

console.log(failures === 0 ? "\nAll RLS checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
