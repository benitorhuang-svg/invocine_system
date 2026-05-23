import { test, expect } from '@playwright/test';

test.describe('Sales Returns E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#tab-staff');
    await page.fill('#auth-identity', 'admin');
    await page.fill('#auth-password', 'admin12345');
    await page.click('#submit-btn');
    await expect(page).toHaveURL(/.*#\/dashboard/);
  });

  test('Create Order and Process Sales Return with Restocking', async ({ page }) => {
    await page.click('[data-nav="#/sales-form"]');
    await expect(page).toHaveURL(/.*#\/sales-form/);

    await page.selectOption('#sales-member', 'MBR-20260522-0001');
    await page.selectOption('select[data-row-idx="0"][data-field="productId"]', 'PROD-B01');
    await page.fill('input[data-row-idx="0"][data-field="quantity"]', '5');
    await page.click('#submit-order-btn');

    const successAlert = page.locator('.text-emerald-400');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('\u5df2\u6210\u529f\u5be9\u6838');

    const successText = await successAlert.textContent();
    const orderIdMatch = successText.match(/SO-[0-9a-zA-Z-]+/);
    const orderId = orderIdMatch ? orderIdMatch[0] : '';
    expect(orderId).not.toBe('');

    await page.click('[data-nav="#/returns-form"]');
    await expect(page).toHaveURL(/.*#\/returns-form/);

    await page.fill('#search-order-id', orderId);
    await page.click('#search-btn');

    await expect(page.locator('text=PROD-B01')).toBeVisible();

    await page.fill('input[data-row-idx="0"][data-field="returnQty"]', '2');

    await page.click('#submit-return-btn');

    const returnSuccessAlert = page.locator('.text-emerald-400');
    await expect(returnSuccessAlert).toBeVisible();
    await expect(returnSuccessAlert).toContainText('\u5be9\u6838\u901a\u904e');

    await page.click('[data-nav="#/dashboard"]');
    await expect(page).toHaveURL(/.*#\/dashboard/);

    const prodRow = page.locator('tr:has-text("PROD-B01")');
    await expect(prodRow).toBeVisible();
    await expect(prodRow.locator('text=47.00')).toBeVisible();
  });
});