import { test, expect } from '@playwright/test';

test.describe('Authentication and Routing E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Staff Login Flow', async ({ page }) => {
    await expect(page).toHaveURL(/.*#\/login/);
    await page.click('#tab-staff');
    await page.fill('#auth-identity', 'admin');
    await page.fill('#auth-password', 'admin12345');
    await page.click('#submit-btn');

    await expect(page).toHaveURL(/.*#\/dashboard/);
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside').locator('span:text-is("ADMIN")')).toBeVisible();

    await page.click('#sidebar-logout-btn');
    await expect(page).toHaveURL(/.*#\/login/);
  });

  test('Member Registration and Login Flow', async ({ page }) => {
    await page.click('#tab-member');
    await page.waitForSelector('#toggle-mode-btn', { state: 'visible' });
    await page.click('#toggle-mode-btn');

    const uniqueEmail = 'testmember_' + Date.now() + '@example.com';
    await page.fill('#reg-name', 'E2E Test Member');
    await page.fill('#reg-phone', '0987654321');
    await page.fill('#auth-identity', uniqueEmail);
    await page.fill('#auth-password', 'Password123');

    await page.click('#submit-btn');
    await expect(page.locator('.text-emerald-400')).toBeVisible();
    await expect(page.locator('.text-emerald-400')).toContainText('\u8a3b\u518a\u6210\u529f');

    await page.fill('#auth-identity', uniqueEmail);
    await page.fill('#auth-password', 'Password123');
    await page.click('#submit-btn');

    await expect(page).toHaveURL(/.*#\/member-portal/);
    await expect(page.locator('text=E2E Test Member')).toBeVisible();
  });
});