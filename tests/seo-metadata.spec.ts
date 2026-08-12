import { test, expect, type Page } from "@playwright/test";

/**
 * SEO guardrails for the public surface.
 *
 * Verifies that every public marketing page carries complete, self-referencing
 * metadata, that private surfaces stay out of the index, and that the dynamic
 * share image renders a real PNG.
 */

const PUBLIC_PAGES = [
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
];

const PRIVATE_PAGES = [
  "/dashboard",
  "/portfoliox",
  "/roadmap",
  "/my-use-cases",
  "/administration",
  "/administration/analytics",
];

async function meta(page: Page, selector: string): Promise<string | null> {
  const locator = page.locator(`head ${selector}`).first();
  return (await locator.count()) ? locator.getAttribute("content") : null;
}

test.describe("public page metadata", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} exposes complete indexable metadata`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${path} should respond 200`).toBe(200);

      const title = await page.title();
      expect(title.length, `${path} needs a title`).toBeGreaterThan(5);
      expect(title.length, `${path} title must stay under 60 chars`).toBeLessThanOrEqual(60);

      const description = await meta(page, 'meta[name="description"]');
      expect(description, `${path} needs a description`).toBeTruthy();
      expect(description!.length).toBeLessThanOrEqual(160);

      expect(await meta(page, 'meta[property="og:title"]')).toBeTruthy();
      expect(await meta(page, 'meta[property="og:description"]')).toBeTruthy();
      expect(await meta(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");

      const robots = await meta(page, 'meta[name="robots"]');
      expect(robots ?? "index, follow").not.toContain("noindex");

      const canonical = await page
        .locator('head link[rel="canonical"]')
        .first()
        .getAttribute("href");
      expect(canonical, `${path} needs a canonical link`).toBeTruthy();
      expect(canonical!.endsWith(path === "/" ? "/" : path)).toBeTruthy();

      // Canonical must be unique — duplicates are invalid and split signals.
      expect(await page.locator('head link[rel="canonical"]').count()).toBe(1);

      // Exactly one H1 per page.
      expect(await page.locator("h1").count()).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe("private surfaces are not indexable", () => {
  for (const path of PRIVATE_PAGES) {
    test(`${path} emits noindex`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const robots = await meta(page, 'meta[name="robots"]');
      expect(robots, `${path} must declare robots meta`).toBeTruthy();
      expect(robots!).toContain("noindex");
      expect(await meta(page, 'meta[name="googlebot"]')).toContain("noindex");
    });
  }
});

test("robots.txt blocks private prefixes and allows public hubs", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const body = await response.text();

  expect(body).toContain("User-agent: *");
  expect(body).not.toMatch(/^Disallow: \/$/m);
  for (const prefix of ["/administration", "/dashboard", "/studio", "/portfoliox"]) {
    expect(body, `${prefix} should be disallowed`).toContain(`Disallow: ${prefix}`);
  }
  for (const publicPath of ["/categories", "/collections", "/repository"]) {
    expect(body).not.toContain(`Disallow: ${publicPath}`);
  }
});

test("sitemap lists public hubs and no private routes", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();

  expect(xml).toContain("<urlset");
  expect(xml).toContain("/categories");
  expect(xml).toContain("/collections");
  for (const prefix of ["/administration", "/dashboard", "/studio"]) {
    expect(xml).not.toContain(`<loc>https://ai-venture-atlas.lovable.app${prefix}`);
  }
});

test("dynamic share image renders a PNG", async ({ request }) => {
  const response = await request.get("/og/use-case/any-slug");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");

  const body = await response.body();
  expect(body.length).toBeGreaterThan(5000);
  // PNG magic number.
  expect(body.subarray(0, 4).toString("hex")).toBe("89504e47");
});
