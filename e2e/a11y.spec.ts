import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  '/',
  '/work',
  '/case-studies/assertkit',
  '/case-studies/craft-factory',
  '/blog',
  '/about',
  '/404',
];

/**
 * `/404` under `astro preview` may respond 200 (route resolved) or 404 (server
 * fell through to the generated 404 page). Either way the 404 markup renders; if
 * a bare `/404` somehow does not resolve, hit a definitely-missing path so the
 * server serves the generated 404 page body.
 */
async function open(page: import('@playwright/test').Page, route: string) {
  if (route === '/404') {
    const res = await page.goto('/404');
    const looks404 = await page
      .getByRole('heading', { level: 1, name: /page not found/i })
      .count();
    if (!res || (res.status() !== 200 && looks404 === 0)) {
      await page.goto('/this-route-definitely-does-not-exist-42');
    }
    return;
  }
  await page.goto(route);
}

for (const route of routes) {
  test(`no serious/critical axe violations on ${route}`, async ({ page }) => {
    await open(page, route);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const bad = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    expect(
      bad,
      JSON.stringify(
        bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })),
        null,
        2,
      ),
    ).toEqual([]);
  });
}
