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

test('production OG image and robots.txt load', async ({ request }) => {
  // This project ships no favicon (nothing under public/ or src/ references one —
  // see docs/deploy.md punch list). robots.txt is the stand-in static-asset
  // liveness check alongside the Task 10 OG image.
  expect((await request.get(`${BASE}/og/default.png`)).ok()).toBeTruthy();
  expect((await request.get(`${BASE}/robots.txt`)).ok()).toBeTruthy();
});
