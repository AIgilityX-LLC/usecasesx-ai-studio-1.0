/**
 * Structured, secret-free logging for the submission → review → publish flow.
 * Lives outside `*.functions.ts` so those files stay thin server-fn wrappers.
 */
type Fields = Record<string, unknown>;

const redact = (fields: Fields): Fields =>
  Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [
      k,
      typeof v === "string" && v.length > 200 ? `${v.slice(0, 200)}…` : v,
    ]),
  );

export function logStep(step: string, fields: Fields = {}) {
  console.info(`[submissions] ${step}`, JSON.stringify(redact(fields)));
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
  console.error(
    `[submissions] ${step} FAILED${isRls ? " (RLS denied)" : ""}`,
    JSON.stringify(
      redact({
        ...fields,
        code: error.code ?? null,
        message: error.message,
        details: error.details ?? null,
        hint: error.hint ?? null,
      }),
    ),
  );
  return new Error(isRls ? `${step}: blocked by access policy — ${error.message}` : error.message);
}
