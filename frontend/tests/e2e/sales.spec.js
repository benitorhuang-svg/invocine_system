import { test, expect } from '@playwright/test';

test.describe('Sales Order E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#tab-staff');
    await page.fill('#auth-identity', 'admin');
    await page.fill('#auth-password', 'admin12345');
    await page.click('#submit-btn');
    await expect(page).toHaveURL(/.*#\/dashboard/);
  });

  test('Create and Auto-Approve Sales Order with Stock Reduction', async ({ page }) => {
    await page.click('[data-nav="#/sales-form"]');
    await expect(page).toHaveURL(/.*#\/sales-form/);

    await page.selectOption('#sales-member', 'MBR-20260522-0001');
    await page.selectOption('select[data-row-idx="0"][data-field="productId"]', 'PROD-A01');
    await page.fill('input[data-row-idx="0"][data-field="quantity"]', '2');
    await page.click('#submit-order-btn');

    const successAlert = page.locator('.text-emerald-400');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('\u5df2\u6210\u529f\u5be9\u6838');

    await page.click('[data-nav="#/dashboard"]');
    await expect(page).toHaveURL(/.*#\/dashboard/);

    const prodRow = page.locator('tr:has-text("PROD-A01")');
    await expect(prodRow).toBeVisible();
    await expect(prodRow.locator('text=3.00')).toBeVisible();
  });
});