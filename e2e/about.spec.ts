import { test, expect } from '@playwright/test';

test('about page shows contact links and the CV download', async ({ page }) => {
  await page.goto('/about');
  await expect(
    page.getByRole('link', { name: 'sammybilex@gmail.com' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub' }).first()).toBeVisible();
  // public/cv/tobi-dev-qa.pdf is committed, so the download link renders and points at it.
  const cv = page.getByRole('link', { name: /download cv/i });
  await expect(cv).toHaveCount(1);
  await expect(cv).toHaveAttribute('href', '/cv/tobi-dev-qa.pdf');
});
