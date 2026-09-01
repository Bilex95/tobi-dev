import { test, expect } from '@playwright/test';

/**
 * Post-deploy smoke test. NOT part of `npm run test:e2e` — `playwright.config.ts`
 * has `testIgnore: ['**\/production.spec.ts']`, which excludes this file even when
 * it is named on the CLI. It runs only through its own config, which has no
 * `webServer` and no `baseURL`:
 *
 *   PROD_URL=https://<the real url> npx playwright test --config playwright.prod.config.ts
 *
 * See docs/deploy.md step 8.
 */
const BASE = process.env.PROD_URL ?? 'https://tobi-dev.vercel.app';

test('production home responds 200 over HTTPS with the right canonical', async ({ page }) => {
  const res = await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBe(200);
  expect(page.url()).toMatch(/^https:\/\//);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    new RegExp(BASE.replace(/[.]/g, '\\.')),
  );
});

test('production OG image and favicon load', async ({ request }) => {
  // Static-asset liveness check: the Task 10 OG image and the site favicon
  // (public/favicon.svg, linked from src/layouts/Base.astro) both resolve.
  expect((await request.get(`${BASE}/og/default.png`)).ok()).toBeTruthy();
  expect((await request.get(`${BASE}/favicon.svg`)).ok()).toBeTruthy();
});
