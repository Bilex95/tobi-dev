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
  use: {
    baseURL: 'http://localhost:4321',
    // Pin the emulated OS preference so the "dark by default on first visit"
    // assertion in e2e/theme.spec.ts is deterministic. Note: Playwright's
    // Chromium reports `(prefers-color-scheme: light)` as matching even under
    // `colorScheme: 'no-preference'` (probe: light=true, dark=false), so the
    // brief's inline script would resolve 'light' there. 'dark' is the value
    // that makes the first-visit assertion valid; the toggle-flip and
    // persistence assertions are unaffected.
    colorScheme: 'dark',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
