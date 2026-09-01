import { test, expect } from '@playwright/test';

/**
 * Visual-regression baselines. This file is deliberately kept on its own so CI
 * (Task 13) can run it as a NON-BLOCKING job:  `playwright test e2e/visual.spec.ts`.
 * Every test title is tagged `@visual` so the blocking `e2e` CI job can exclude
 * them with `--grep-invert @visual` while this filename still runs them all.
 * Locally the baselines under `e2e/visual.spec.ts-snapshots/` are generated and
 * committed, so a clean second run matches and the suite stays green.
 */

const routes = ['/', '/work', '/case-studies/assertkit'];
const themes = ['dark', 'light'] as const;
const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 900 },
];

for (const route of routes) {
  for (const theme of themes) {
    for (const vp of viewports) {
      const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
      test(`${slug} — ${theme} — ${vp.name} @visual`, async ({ page }) => {
        await page.addInitScript((t) => {
          try {
            localStorage.setItem('tobi-theme', t as string);
          } catch {}
        }, theme);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        await expect(page).toHaveScreenshot(`${slug}-${theme}-${vp.name}.png`, {
          fullPage: true,
          animations: 'disabled',
        });
      });
    }
  }
}
