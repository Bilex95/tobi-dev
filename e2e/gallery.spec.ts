import { test, expect } from '@playwright/test';

test('gallery lists projects and the tag filter narrows them by keyboard', async ({ page }) => {
  await page.goto('/work');
  const cards = page.locator('[data-project]');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'qa' }).press('Enter');
  await expect(page.locator('[data-project]:not([hidden])')).toHaveCount(
    await page.locator('[data-project][data-tags~="qa"]').count(),
  );
});

test('gallery renders project names without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/work');
  await expect(page.locator('[data-project]').first()).toBeVisible();
  await ctx.close();
});
