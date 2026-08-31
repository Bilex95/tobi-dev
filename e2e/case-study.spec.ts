import { test, expect } from '@playwright/test';

test('assertkit case study renders and links forward to craft-factory', async ({ page }) => {
  await page.goto('/case-studies/assertkit');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('assertkit');
  await page.getByRole('link', { name: /craft-factory/i }).click();
  await expect(page).toHaveURL(/\/case-studies\/craft-factory/);
});
