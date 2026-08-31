import { test, expect } from '@playwright/test';

test('home hero CTA points at the assertkit case study', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const cta = page.getByRole('link', { name: /read the assertkit case study/i });
  await expect(cta).toHaveAttribute('href', '/case-studies/assertkit');
});

test('home shows featured projects and a contact link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-project]')).not.toHaveCount(0);
  await expect(page.getByRole('link', { name: /email|contact/i })).toBeVisible();
});
