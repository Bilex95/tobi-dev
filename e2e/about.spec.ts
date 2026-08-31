import { test, expect } from '@playwright/test';

test('about page shows contact links and hides CV button when no PDF is present', async ({
  page,
}) => {
  await page.goto('/about');
  await expect(
    page.getByRole('link', { name: 'sammybilex@gmail.com' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub' }).first()).toBeVisible();
  // No public/cv/tobi-dev-qa.pdf committed yet, so the download link is absent.
  // Flip this to toHaveCount(1) in the same commit that adds a real PDF.
  await expect(page.getByRole('link', { name: /download cv/i })).toHaveCount(0);
});
