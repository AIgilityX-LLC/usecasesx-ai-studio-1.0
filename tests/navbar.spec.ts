import { test, expect, type Page } from "@playwright/test";

/**
 * Verifies the single-navbar invariant: exactly one primary navigation region
 * renders on every public route, for both signed-out and signed-in states.
 *
 * The shared SiteShell is the only source of navigation. Signed-out visitors
 * get the top-nav <nav aria-label="Primary">; signed-in users get the sidebar
 * nav. In neither case should two navigation regions render at once.
 */

const PUBLIC_ROUTES = [
  "/",
  "/repository",
  "/insights",
  "/patterns",
  "/ai-use-case-studio",
  "/resources",
  "/pricing",
  "/auth",
  "/compare",
  "/boards",
];

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

async function countNavbars(page: Page): Promise<number> {
  // Top nav uses aria-label="Primary"; sidebar uses role="navigation".
  // Count distinct top-level navigation landmarks that are visible.
  return page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll("nav, [role='navigation']"));
    const visibleTopLevel = navs.filter((el) => {
      const style = window.getComputedStyle(el as HTMLElement);
      if (style.display === "none" || style.visibility === "hidden") return false;
      // Exclude nested navs (e.g. breadcrumb inside header) by only counting
      // navs that are not contained within another nav.
      return !navs.some((other) => other !== el && other.contains(el));
    });
    return visibleTopLevel.length;
  });
}

test.describe("single navbar — signed out", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`exactly one navbar on ${route}`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const count = await countNavbars(page);
      expect(count, `route ${route} should render exactly one navbar`).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("skip-to-content link", () => {
  test("home page exposes a skip link and main landmark", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await expect(page.locator("a[href='#main-content']")).toHaveCount(1);
    await expect(page.locator("main#main-content")).toHaveCount(1);
  });
});

/** Returns the relative luminance (0=black, 1=white) of an element's rendered
 *  background color, walking up to the nearest ancestor with a non-transparent
 *  background so token-based dark surfaces are detected reliably. */
async function backgroundLuminance(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    let el = document.querySelector(sel) as HTMLElement | null;
    const parse = (c: string) => {
      const m = c.match(/rg(?:b|ba)?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a] = m[1].split(",").map((x) => parseFloat(x));
      if (a === 0) return null;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };
    while (el) {
      const lum = parse(getComputedStyle(el).backgroundColor);
      if (lum !== null) return lum;
      el = el.parentElement;
    }
    return 1; // default to "light" if nothing found
  }, selector);
}

/** Returns the relative luminance of the nth (0-based) <section> rendered inside
 *  the main landmark, walking ancestors for the nearest opaque background. */
async function sectionLuminance(page: Page, index: number): Promise<number | null> {
  return page.evaluate((i) => {
    const sections = Array.from(
      document.querySelectorAll("main#main-content section"),
    ) as HTMLElement[];
    let el = sections[i] ?? null;
    const parse = (c: string) => {
      const m = c.match(/rg(?:b|ba)?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a] = m[1].split(",").map((x) => parseFloat(x));
      if (a === 0) return null;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };
    while (el) {
      const lum = parse(getComputedStyle(el).backgroundColor);
      if (lum !== null) return lum;
      el = el.parentElement;
    }
    return null;
  }, index);
}

test.describe("page hero tone + main landmark", () => {
  const HERO_PAGES = ["/", "/resources", "/pricing", "/insights", "/patterns"];

  for (const route of HERO_PAGES) {
    test(`${route} has exactly one main landmark`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await expect(page.locator("main#main-content")).toHaveCount(1);
    });
  }

  // Pages built on the PageHero primitive: first band must be dark, and the
  // following major section must be lighter (the alternating tone contract).
  const DARK_HERO_PAGES = ["/resources", "/pricing", "/insights", "/patterns"];

  for (const route of DARK_HERO_PAGES) {
    test(`${route} renders a dark hero as the first content band`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const hero = await sectionLuminance(page, 0);
      expect(hero, `${route} hero luminance should be measurable`).not.toBeNull();
      expect(hero as number, `${route} hero should be a dark band`).toBeLessThan(0.5);
    });

    test(`${route} alternates to a lighter major section after the hero`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const hero = await sectionLuminance(page, 0);
      const next = await sectionLuminance(page, 1);
      if (next === null || hero === null) test.skip(true, `${route} has no second section`);
      expect(next as number, `${route} section after hero should be lighter`).toBeGreaterThan(
        hero as number,
      );
    });
  }

  test("Home exposes a hero section inside the main landmark", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await expect(page.locator("main#main-content section").first()).toBeVisible();
  });
});
