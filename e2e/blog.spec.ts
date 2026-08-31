import { test, expect } from '@playwright/test';

test('blog index lists the seed post and links to its page', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');

  const postLink = page.getByRole('link', {
    name: 'Building a portfolio that maintains itself',
  });
  await expect(postLink).toBeVisible();
  await postLink.click();

  await expect(page).toHaveURL(/\/blog\/building-a-portfolio-pipeline\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Building a portfolio that maintains itself',
  );
});
