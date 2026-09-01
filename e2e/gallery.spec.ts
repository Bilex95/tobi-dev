import { test, expect } from '@playwright/test';

test('gallery lists projects and the tag filter narrows them by keyboard', async ({ page }) => {
  await page.goto('/work');
  const cards = page.locator('[data-project]');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  // Don't hardcode a tag name — the tag set is live GitHub data once repos are
  // `portfolio`-tagged. Take the first real filter button (not "All") and assert
  // it narrows the grid to exactly the cards carrying that tag.
  const firstTag = page.locator('.tag-filter button[data-tag]:not([data-tag="*"])').first();
  const tag = await firstTag.getAttribute('data-tag');
  expect(tag).toBeTruthy();
  await firstTag.press('Enter');
  await expect(page.locator('[data-project]:not([hidden])')).toHaveCount(
    await page.locator(`[data-project][data-tags~="${tag}"]`).count(),
  );
});

test('gallery renders project names without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/work');
  await expect(page.locator('[data-project]').first()).toBeVisible();
  await ctx.close();
});
