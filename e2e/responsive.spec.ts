import { test, expect } from '@playwright/test';

const widths = [320, 375, 768, 1024, 1440];
const routes = [
  '/',
  '/work',
  // Long-form routes: the widest content on the site (markdown tables, <pre>
  // blocks) lives here, so they are the ones that regress first.
  '/case-studies/assertkit',
  '/blog/building-a-portfolio-pipeline',
];

for (const route of routes) {
  for (const width of widths) {
    test(`no horizontal scroll on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(1);
    });

    test(`nav tap targets are >= 44px on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);

      const controls = page.locator('nav[aria-label="Primary"] a, nav[aria-label="Primary"] button');
      const count = await controls.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const el = controls.nth(i);
        const box = await el.boundingBox();
        const label =
          (await el.getAttribute('aria-label')) ||
          (await el.textContent())?.trim() ||
          `control ${i}`;
        expect(box, `${label} has no box`).not.toBeNull();
        expect(box!.width, `${label} width ${box!.width}`).toBeGreaterThanOrEqual(44);
        expect(box!.height, `${label} height ${box!.height}`).toBeGreaterThanOrEqual(44);
      }
    });
  }
}
