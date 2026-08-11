/**
 * Structured, secret-free logging for the submission → review → publish flow.
 * Lives outside `*.functions.ts` so those files stay thin server-fn wrappers.
 */
type Fields = Record<string, unknown>;

/**
 * One correlation ID per submission/review request. Every log line and audit
 * row emitted while handling that request carries it, so a single
 * submit → submit-for-review → approve → publish flow can be traced end to end
 * in the server logs and in the admin audit page.
 */
export function newCorrelationId(): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `sub_${raw.replace(/-/g, "").slice(0, 16)}`;
}

const redact = (fields: Fields): Fields =>
  Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [
      k,
      typeof v === "string" && v.length > 200 ? `${v.slice(0, 200)}…` : v,
    ]),
  );

export function logStep(step: string, fields: Fields = {}) {
  const { cid, ...rest } = fields as { cid?: string } & Fields;
  console.info(`[submissions]${cid ? ` [cid=${cid}]` : ""} ${step}`, JSON.stringify(redact(rest)));
}

/**
 * Logs a failed database call with everything needed to tell an RLS denial
 * apart from a constraint violation, then returns an Error to throw.
 */
export function logDbFailure(
  step: string,
  error: { message: string; code?: string; details?: string | null; hint?: string | null },
  fields: Fields = {},
) {
  const isRls =
    /row-level security|violates row-level/i.test(error.message) || error.code === "42501";
  const { cid, ...rest } = fields as { cid?: string } & Fields;
  console.error(
    `[submissions]${cid ? ` [cid=${cid}]` : ""} ${step} FAILED${isRls ? " (RLS denied)" : ""}`,
    JSON.stringify(
      redact({
        ...rest,
        code: error.code ?? null,
        message: error.message,
        details: error.details ?? null,
        hint: error.hint ?? null,
      }),
    ),
  );
  return new Error(
    isRls
      ? `${step}: blocked by access policy — ${error.message}${cid ? ` (trace ${cid})` : ""}`
      : error.message,
  );
}
