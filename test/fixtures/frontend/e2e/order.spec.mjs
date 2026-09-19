import { test, expect } from '@playwright/test';

test('real form blocks repeat submit, reports failure, and allows a successful retry', async ({ page }) => {
  let requests = 0;
  let release;
  await page.route('**/api/orders', async route => {
    requests++;
    if (requests === 1) {
      await new Promise(resolve => { release = resolve; });
      await route.fulfill({ status: 500, body: '{}' });
    } else await route.fulfill({ status: 200, contentType: 'application/json', body: '{"accepted":true}' });
  });
  await page.goto('/');
  const form = page.locator('form');
  await expect(page.getByText('Server-rendered catalogue')).toBeVisible();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('button', { name: 'Submitting' })).toBeDisabled();
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(form.getByRole('alert')).toHaveText('Order failed. Try again.');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(form.getByRole('status')).toHaveText('Order received');
  await expect(form.getByRole('alert')).toHaveCount(0);
  expect(requests).toBe(2);
});
