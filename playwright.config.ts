import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/production.spec.ts'],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4321' },
  expect: {
    // Visual-regression tolerance: absorb sub-pixel anti-aliasing noise so
    // baselines match on a clean re-run without hiding real layout changes.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
