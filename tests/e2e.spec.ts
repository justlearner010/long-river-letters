import { test, expect } from '@playwright/test';

test('map renders and chapters switch', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('world-map')).toBeVisible();
  await page.getByRole('button', { name: /1500 征服与全球连接/ }).click();
  await expect(page.getByText(/全球帝国初现/).first()).toBeVisible();
  await expect(page.getByTestId('world-map')).not.toBeEmpty();
});
