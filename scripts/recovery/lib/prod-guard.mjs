/**
 * Refuse recovery scripts when the target URL looks like production.
 * Never prints secret values — only whether a guard tripped.
 */

/**
 * @param {string | undefined} supabaseUrl
 * @param {string | undefined} productionRef from env PRODUCTION_SUPABASE_PROJECT_REF (optional)
 */
export function assertNotProductionTarget(supabaseUrl, productionRef) {
  const url = (supabaseUrl ?? "").trim();
  if (!url) {
    throw new Error("SUPABASE_URL is required (TEST project only).");
  }
  const prod = (productionRef ?? process.env.PRODUCTION_SUPABASE_PROJECT_REF ?? "").trim();
  if (prod && url.includes(prod)) {
    throw new Error(
      "Refusing to run: SUPABASE_URL matches PRODUCTION_SUPABASE_PROJECT_REF. Use the TEST project.",
    );
  }
  // Soft heuristic — never print the URL.
  const looksProdLike =
    /\bprod(uction)?\b/i.test(url) && !/\b(test|staging|preview|local)\b/i.test(url);
  if (looksProdLike && process.env.ALLOW_PROD_LIKE_URL !== "1") {
    throw new Error(
      "Refusing to run: SUPABASE_URL appears production-like. Set a TEST project URL or override with ALLOW_PROD_LIKE_URL=1 only after human review.",
    );
  }
  if (looksProdLike && process.env.ALLOW_PROD_LIKE_URL === "1") {
    console.warn("ALLOW_PROD_LIKE_URL=1 set — human override acknowledged (URL not printed).");
  }
}
