/**
 * One-shot helper: copy administration routes under /platform-admin and leave
 * thin redirect stubs at the legacy paths. Idempotent if new files already exist.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routes = resolve(root, "src/routes");

/** [legacyFileBase, newFileBase, legacyRouteId, newRouteId, redirectTo] */
const MOVES = [
  [
    "_app.administration.founding-access",
    "_app.platform-admin.founding-access",
    "/_app/administration/founding-access",
    "/_app/platform-admin/founding-access",
    "/platform-admin/founding-access",
  ],
  [
    "_app.administration.requests",
    "_app.platform-admin.requests",
    "/_app/administration/requests",
    "/_app/platform-admin/requests",
    "/platform-admin/requests",
  ],
  [
    "_app.administration.leads",
    "_app.platform-admin.leads",
    "/_app/administration/leads",
    "/_app/platform-admin/leads",
    "/platform-admin/leads",
  ],
  [
    "_app.administration.email-delivery",
    "_app.platform-admin.email-delivery",
    "/_app/administration/email-delivery",
    "/_app/platform-admin/email-delivery",
    "/platform-admin/email-delivery",
  ],
  [
    "_app.administration.ai-engines",
    "_app.platform-admin.ai-engines",
    "/_app/administration/ai-engines",
    "/_app/platform-admin/ai-engines",
    "/platform-admin/ai-engines",
  ],
  [
    "_app.administration.release-candidate",
    "_app.platform-admin.release-candidate",
    "/_app/administration/release-candidate",
    "/_app/platform-admin/release-candidate",
    "/platform-admin/release-candidate",
  ],
  [
    "_app.administration.launch-checks",
    "_app.platform-admin.launch-checks",
    "/_app/administration/launch-checks",
    "/_app/platform-admin/launch-checks",
    "/platform-admin/launch-checks",
  ],
  [
    "_app.administration.production-readiness",
    "_app.platform-admin.production-readiness",
    "/_app/administration/production-readiness",
    "/_app/platform-admin/production-readiness",
    "/platform-admin/production-readiness",
  ],
  [
    "_app.administration.production-data",
    "_app.platform-admin.production-data",
    "/_app/administration/production-data",
    "/_app/platform-admin/production-data",
    "/platform-admin/production-data",
  ],
  [
    "_app.administration.platform-admins",
    "_app.platform-admin.platform-admins",
    "/_app/administration/platform-admins",
    "/_app/platform-admin/platform-admins",
    "/platform-admin/platform-admins",
  ],
  [
    "_app.administration.pilot",
    "_app.platform-admin.pilot",
    "/_app/administration/pilot",
    "/_app/platform-admin/pilot",
    "/platform-admin/pilot",
  ],
  [
    "_app.administration.pilot-milestones",
    "_app.platform-admin.pilot-milestones",
    "/_app/administration/pilot-milestones",
    "/_app/platform-admin/pilot-milestones",
    "/platform-admin/pilot-milestones",
  ],
  [
    "_app.administration.launch-readiness",
    "_app.platform-admin.launch-readiness",
    "/_app/administration/launch-readiness",
    "/_app/platform-admin/launch-readiness",
    "/platform-admin/launch-readiness",
  ],
  [
    "_app.administration.launch-learning",
    "_app.platform-admin.launch-learning",
    "/_app/administration/launch-learning",
    "/_app/platform-admin/launch-learning",
    "/platform-admin/launch-learning",
  ],
  [
    "_app.administration.feedback",
    "_app.platform-admin.feedback",
    "/_app/administration/feedback",
    "/_app/platform-admin/feedback",
    "/platform-admin/feedback",
  ],
  [
    "_app.administration.analytics",
    "_app.platform-admin.analytics",
    "/_app/administration/analytics",
    "/_app/platform-admin/analytics",
    "/platform-admin/analytics",
  ],
  [
    "_app.administration.readiness.index",
    "_app.platform-admin.readiness.index",
    "/_app/administration/readiness/",
    "/_app/platform-admin/readiness/",
    "/platform-admin/readiness/",
  ],
  [
    "_app.administration.readiness.$audience",
    "_app.platform-admin.readiness.$audience",
    "/_app/administration/readiness/$audience",
    "/_app/platform-admin/readiness/$audience",
    null, // parametric — stub written separately
  ],
  [
    "_app.admin-submissions",
    "_app.platform-admin.submissions",
    "/_app/admin-submissions",
    "/_app/platform-admin/submissions",
    "/platform-admin/submissions",
  ],
  [
    "_app.admin-waitlist",
    "_app.platform-admin.waitlist",
    "/_app/admin-waitlist",
    "/_app/platform-admin/waitlist",
    "/platform-admin/waitlist",
  ],
  [
    "_app.admin-audit",
    "_app.platform-admin.submission-audit",
    "/_app/admin-audit",
    "/_app/platform-admin/submission-audit",
    "/platform-admin/submission-audit",
  ],
];

function redirectStub(legacyRouteId, to) {
  return `import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("${legacyRouteId}")({
  beforeLoad: () => {
    throw redirect({ to: "${to}", replace: true });
  },
});
`;
}

function redirectStubAudience() {
  return `import { createFileRoute, redirect } from "@tanstack/react-router";

/** Compatibility redirect — platform ops live under /platform-admin. */
export const Route = createFileRoute("/_app/administration/readiness/$audience")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/platform-admin/readiness/$audience",
      params: { audience: params.audience },
      replace: true,
    });
  },
});
`;
}

let created = 0;
let redirected = 0;

for (const [legacyBase, newBase, legacyId, newId, to] of MOVES) {
  const legacyPath = resolve(routes, `${legacyBase}.tsx`);
  const newPath = resolve(routes, `${newBase}.tsx`);
  if (!existsSync(legacyPath) && !existsSync(newPath)) {
    console.warn("missing", legacyBase);
    continue;
  }

  if (!existsSync(newPath) && existsSync(legacyPath)) {
    let src = readFileSync(legacyPath, "utf8");
    // Prefer exact createFileRoute path replacement.
    if (src.includes(`createFileRoute("${legacyId}")`)) {
      src = src.replace(`createFileRoute("${legacyId}")`, `createFileRoute("${newId}")`);
    } else if (src.includes(`createFileRoute('${legacyId}')`)) {
      src = src.replace(`createFileRoute('${legacyId}')`, `createFileRoute('${newId}')`);
    } else {
      // readiness index uses trailing slash variant; also try without trailing slash
      const altLegacy = legacyId.replace(/\/$/, "");
      const altNew = newId.replace(/\/$/, "");
      if (src.includes(`createFileRoute("${altLegacy}")`)) {
        src = src.replace(`createFileRoute("${altLegacy}")`, `createFileRoute("${altNew}")`);
      } else if (src.includes(`createFileRoute("${legacyId.replace(/\/$/, "")}/")`)) {
        src = src.replace(
          `createFileRoute("${legacyId.replace(/\/$/, "")}/")`,
          `createFileRoute("${newId}")`,
        );
      } else {
        console.warn("path not found in", legacyBase, "— copying raw and patching loosely");
        src = src
          .replaceAll("/_app/administration/", "/_app/platform-admin/")
          .replaceAll("/_app/admin-submissions", "/_app/platform-admin/submissions")
          .replaceAll("/_app/admin-waitlist", "/_app/platform-admin/waitlist")
          .replaceAll("/_app/admin-audit", "/_app/platform-admin/submission-audit");
      }
    }
    // Internal links that still point at legacy admin URLs.
    src = src
      .replaceAll('to="/administration/', 'to="/platform-admin/')
      .replaceAll("to={'/administration/", "to={'/platform-admin/")
      .replaceAll('href="/administration/', 'href="/platform-admin/')
      .replaceAll('to="/admin-submissions"', 'to="/platform-admin/submissions"')
      .replaceAll('to="/admin-waitlist"', 'to="/platform-admin/waitlist"')
      .replaceAll('to="/admin-audit"', 'to="/platform-admin/submission-audit"');

    mkdirSync(dirname(newPath), { recursive: true });
    writeFileSync(newPath, src);
    created += 1;
    console.log("created", newBase);
  }

  if (to) {
    writeFileSync(legacyPath, redirectStub(legacyId.replace(/\/$/, "") || legacyId, to));
    redirected += 1;
  } else if (legacyBase.includes("readiness.$audience")) {
    writeFileSync(legacyPath, redirectStubAudience());
    redirected += 1;
  }
}

console.log(JSON.stringify({ created, redirected }, null, 2));
