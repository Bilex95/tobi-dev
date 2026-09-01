import { defineConfig, devices } from '@playwright/test';

/**
 * Nightly cross-browser smoke config (see `.github/workflows/cross-browser.yml`).
 *
 * Same web server and expectations as `playwright.config.ts`, but:
 *  - runs on Firefox + WebKit instead of Chromium
 *  - `testMatch` is limited to the six FUNCTIONAL specs
 *    (theme, gallery, home, case-study, about, blog) — the a11y, responsive and
 *    visual specs are Chromium-only gates and are deliberately excluded here.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/production.spec.ts'],
  testMatch: /(theme|gallery|home|case-study|about|blog)\.spec\.ts$/,
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4321' },
  expect: {
    // Match the base config's visual-regression tolerance for parity.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
