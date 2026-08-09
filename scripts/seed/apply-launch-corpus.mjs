/**
 * Applies the generated launch corpus (see scripts/seed/launch_corpus.py) to the
 * global repository: taxonomy rows, published use cases with provenance and
 * quality status, taxonomy junctions, headline metrics and curated public
 * collections.
 *
 * Idempotent: every write is an upsert keyed on a natural key.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *   python3 scripts/seed/launch_corpus.py
 *   bun run scripts/seed/apply-launch-corpus.mjs
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const OWNER = process.env.CORPUS_OWNER_USER_ID;
if (!OWNER)
  throw new Error("Missing CORPUS_OWNER_USER_ID (owner of the curated public collections)");

const PAYLOAD = process.env.CORPUS_PAYLOAD ?? "/tmp/seed/corpus.json";
const corpus = JSON.parse(readFileSync(PAYLOAD, "utf8"));
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Deterministic uuid from a stable slug so re-runs target the same row. */
function stableUuid(seed) {
  const h = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function fail(step, error) {
  if (error) throw new Error(`${step}: ${error.message}`);
}

async function upsertTaxonomy(table, rows) {
  const { error } = await db.from(table).upsert(rows, { onConflict: "slug" });
  fail(`taxonomy ${table}`, error);
  const { data, error: readErr } = await db.from(table).select("id, slug");
  fail(`read ${table}`, readErr);
  return new Map(data.map((r) => [r.slug, r.id]));
}

const RANK = { Low: 2, Medium: 3, High: 4, Critical: 5 };

async function main() {
  const industries = await upsertTaxonomy("industries", corpus.industries);
  const functions = await upsertTaxonomy("business_functions", corpus.functions);
  const capabilities = await upsertTaxonomy("ai_capabilities", corpus.capabilities);
  const objectives = await upsertTaxonomy("business_objectives", corpus.objectives);

  const now = new Date().toISOString();
  const rows = corpus.use_cases.map((r) => ({
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    problem: r.problem,
    solution: r.solution,
    business_problem: r.problem,
    ai_solution_concept: r.solution,
    business_value: r.business_value,
    data_required: r.data_required,
    kpis: r.kpis,
    roi_areas: r.roi,
    value_potential: r.value,
    complexity: r.cx,
    risk_level: r.risk,
    time_to_value: r.ttv,
    maturity: r.mat,
    maturity_level: r.mat,
    impact_score: RANK[r.value] ?? 3,
    effort_score: RANK[r.cx] ?? 3,
    risk_score: RANK[r.risk] ?? 3,
    status: "published",
    visibility: "both",
    content_status: "published",
    published_at: now,
    display_order: r.display_order,
    region: r.region,
    outcomes: r.outcomes,
    implementation_notes: r.implementation_notes,
    governance_notes: r.governance_notes,
    cybersecurity_notes: r.cybersecurity_notes,
    privacy_notes: r.privacy_notes,
    governance_required: r.governance_required,
    privacy_review_required: r.privacy_review_required,
    cyber_review_required: r.cyber_review_required,
    assurance_review_required: r.assurance_review_required,
    provenance: r.provenance,
    provenance_note: r.provenance_note,
    quality_status: r.quality_status,
    quality_checked_at: now,
    is_featured: r.is_featured,
    show_on_landing: r.is_featured,
  }));

  for (let i = 0; i < rows.length; i += 25) {
    const { error } = await db
      .from("use_cases")
      .upsert(rows.slice(i, i + 25), { onConflict: "slug" });
    fail(`use_cases batch ${i / 25}`, error);
  }

  const { data: stored, error: storedErr } = await db
    .from("use_cases")
    .select("id, slug")
    .in(
      "slug",
      corpus.use_cases.map((r) => r.slug),
    );
  fail("read use_cases", storedErr);
  const ids = new Map(stored.map((r) => [r.slug, r.id]));

  const junction = (table, key, lookup, pick) =>
    corpus.use_cases
      .map((r) => ({ use_case_id: ids.get(r.slug), [key]: lookup.get(pick(r)) }))
      .filter((r) => r.use_case_id && r[key]);

  const links = [
    ["use_case_industries", "industry_id", industries, (r) => r.ind],
    ["use_case_capabilities", "capability_id", capabilities, (r) => r.cap],
    ["use_case_business_functions", "business_function_id", functions, (r) => r.func],
    ["use_case_business_objectives", "objective_id", objectives, (r) => r.obj],
  ];
  for (const [table, key, lookup, pick] of links) {
    const payload = junction(table, key, lookup, pick);
    for (let i = 0; i < payload.length; i += 100) {
      const { error } = await db.from(table).upsert(payload.slice(i, i + 100), {
        onConflict: `use_case_id,${key}`,
        ignoreDuplicates: true,
      });
      fail(`junction ${table}`, error);
    }
  }

  const metrics = corpus.use_cases.flatMap((r) =>
    r.kpis.slice(0, 2).map((label, sort_order) => ({
      use_case_id: ids.get(r.slug),
      label,
      value: "Target",
      sort_order,
    })),
  );
  const { data: existingMetrics } = await db.from("use_case_metrics").select("use_case_id, label");
  const seen = new Set((existingMetrics ?? []).map((m) => `${m.use_case_id}::${m.label}`));
  const freshMetrics = metrics.filter(
    (m) => m.use_case_id && !seen.has(`${m.use_case_id}::${m.label}`),
  );
  for (let i = 0; i < freshMetrics.length; i += 100) {
    const { error } = await db.from("use_case_metrics").insert(freshMetrics.slice(i, i + 100));
    fail("use_case_metrics", error);
  }

  for (const c of corpus.collections) {
    const id = stableUuid(`usecasex-collection:${c.slug}`);
    const { error } = await db.from("collections").upsert(
      {
        id,
        user_id: OWNER,
        name: c.name,
        description: c.description,
        is_public: true,
        share_token: stableUuid(`usecasex-collection-token:${c.slug}`),
      },
      { onConflict: "id" },
    );
    fail(`collection ${c.slug}`, error);

    const items = c.members
      .map((slug, position) => ({ collection_id: id, use_case_id: ids.get(slug), position }))
      .filter((i) => i.use_case_id);
    const { error: itemsErr } = await db
      .from("collection_items")
      .upsert(items, { onConflict: "collection_id,use_case_id", ignoreDuplicates: true });
    fail(`collection items ${c.slug}`, itemsErr);
  }

  console.log(
    `Applied ${rows.length} use cases, ${corpus.industries.length} industries, ` +
      `${corpus.functions.length} functions, ${corpus.collections.length} curated collections.`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
