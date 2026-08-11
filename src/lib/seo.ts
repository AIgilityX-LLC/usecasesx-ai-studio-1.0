/**
 * Public-site SEO helpers.
 *
 * One place owns the canonical origin, the indexable path list (also read by
 * `/sitemap.xml`) and the head() shapes for public vs. authenticated routes so
 * private surfaces can never drift into the index.
 */

export const SITE_URL = "https://usecasesx.aigilityx.com";
export const SITE_NAME = "UseCasesX™ by AIgilityX™";

/** Public, indexable marketing and repository paths. */
export const PUBLIC_INDEXABLE_PATHS = [
  "/",
  "/how-it-works",
  "/editions",
  "/advisory",
  "/enterprise",
  "/about",
  "/contact",
  "/pricing",
  "/repository",
  "/categories",
  "/collections",
  "/discover",
  "/insights",
  "/patterns",
  "/resources",
  "/quick-wins",
  "/roi-calculator",
  "/sarpi",
  "/segments/sme",
  "/segments/enterprise",
  "/segments/government",
  "/segments/defense",
  "/segments/critical-infrastructure",
  "/getting-started",
  "/faq",
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/ai-notice",
  "/founding-access-terms",
  "/data-rights",
] as const;

/**
 * Authenticated / workspace surfaces. Mirrored into `public/robots.txt`;
 * each of these routes also emits `robots: noindex, nofollow`.
 */
export const PRIVATE_PATH_PREFIXES = [
  "/account",
  "/administration",
  "/admin-submissions",
  "/admin-audit",
  "/admin-observability",
  "/admin-waitlist",
  "/boards",
  "/c/",
  "/compare",
  "/dashboard",
  "/decision",
  "/demo-login",
  "/demo-scenarios",
  "/entitlement",
  "/handoffs",
  "/invite",
  "/module-analytics",
  "/my-use-cases",
  "/onboarding",
  "/opportunities",
  "/opportunity-map",
  "/p/",
  "/portfoliox",
  "/pro",
  "/profile",
  "/reports",
  "/roadmap",
  "/studio",
  "/submit",
  "/workshops",
] as const;

export interface PublicHeadInput {
  /** Route path beginning with "/" — used for canonical and og:url. */
  path: string;
  title: string;
  description: string;
  /** Absolute https URL of a meaningful hero/cover image, when one exists. */
  image?: string;
  ogType?: "website" | "article";
  /** JSON-LD objects rendered into <head>. */
  jsonLd?: Record<string, unknown>[];
}

/** Complete, self-referencing metadata for a public page. */
export function publicHead({
  path,
  title,
  description,
  image,
  ogType = "website",
  jsonLd = [],
}: PublicHeadInput) {
  const url = `${SITE_URL}${path}`;
  const meta = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(image
      ? [
          { property: "og:image", content: image },
          { name: "twitter:image", content: image },
        ]
      : []),
  ];

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    ...(jsonLd.length
      ? {
          scripts: jsonLd.map((node) => ({
            type: "application/ld+json",
            children: JSON.stringify(node),
          })),
        }
      : {}),
  };
}

/** Metadata for an authenticated/workspace route: never indexed. */
export function privateHead(title: string) {
  return {
    meta: [
      { title: `${title} — UseCasesX™` },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  };
}

/** Breadcrumb JSON-LD for a public page nested under the home page. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
