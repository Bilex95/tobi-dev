import { defineConfig, devices } from '@playwright/test';

/**
 * Config for the post-deploy smoke test ONLY.
 *
 * `playwright.config.ts` has `testIgnore: ['**\/production.spec.ts']`, which
 * excludes that file even when it is named explicitly on the CLI — so the
 * production smoke needs its own config. This one has no `webServer` (the spec
 * hits a live remote URL via `process.env.PROD_URL`, it must not start a local
 * server) and no `baseURL`.
 *
 *   PROD_URL=https://<the real url> npx playwright test --config playwright.prod.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/production.spec.ts'],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
