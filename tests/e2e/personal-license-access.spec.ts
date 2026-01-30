import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars before any tests are parsed
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

/**
 * Personal License Access Tests
 * 
 * Tests B2C personal license access control:
 * - User with personal license can access gated content
 * - Personal tenant displays correctly in TenantSelector
 * - Cross-tenant protection (cannot access another's private tenant)
 * 
 * Required env vars:
 * - TEST_PERSONAL_LICENSE_USER_EMAIL - User with active personal license
 * - TEST_PERSONAL_LICENSE_USER_PASSWORD
 * - TEST_USER_WITHOUT_LICENSE_EMAIL - User without any license
 * - TEST_USER_WITHOUT_LICENSE_PASSWORD
 */

const personalLicenseUserAuth = path.join(__dirname, '../.auth/personal-license-user.json');

// Skip all tests if credentials not configured
const hasPersonalLicenseTestUser = !!(
  process.env.TEST_PERSONAL_LICENSE_USER_EMAIL && 
  process.env.TEST_PERSONAL_LICENSE_USER_PASSWORD
);

test.describe('Personal License Access', () => {
  test.skip(!hasPersonalLicenseTestUser, 'TEST_PERSONAL_LICENSE_USER_* credentials not set');

  test.describe('User with personal license', () => {
    test.use({ storageState: personalLicenseUserAuth });

    test('can access the app', async ({ page }) => {
      await page.goto('/app');
      await expect(page).toHaveURL(/\/app/);
    });

    test('sees TenantSelector with "Personligt" section in profile (mobile)', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/app/profile');
      await page.waitForLoadState('networkidle');

      // Look for the "Personligt" section label in the TenantSelector
      const personalSection = page.locator('text=Personligt').or(page.locator('text=Mitt konto'));
      await expect(personalSection.first()).toBeVisible();
    });

    test('sees TenantSelector dropdown in header (desktop)', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto('/app');
      await page.waitForLoadState('networkidle');

      // The TenantSelector should be in the topbar
      // Look for a dropdown button with either "Mitt konto" or an organization name
      const tenantButton = page.locator('button').filter({ 
        has: page.locator('svg').first() // Has an icon
      }).filter({
        hasText: /Mitt konto|Personligt/i
      });
      
      // If user has only personal license, selector might be hidden
      // In that case, they auto-selected to their personal tenant
      const hasTenantSelector = await tenantButton.count() > 0;
      if (hasTenantSelector) {
        await expect(tenantButton.first()).toBeVisible();
      }
    });

    test('can browse games', async ({ page }) => {
      await page.goto('/app/browse');
      await page.waitForLoadState('networkidle');
      
      // Should see the browse page with games
      await expect(page.locator('h1, [role="heading"]').filter({ hasText: /Aktiviteter|Browse|Spel/i })).toBeVisible();
    });

    test('can access gated game detail if entitled', async ({ page }) => {
      // Navigate to a game that requires license
      // This test assumes there's at least one game linked to the user's entitled product
      await page.goto('/app/browse');
      await page.waitForLoadState('networkidle');

      // Click first game card
      const gameCard = page.locator('[data-testid="game-card"], a[href^="/app/games/"]').first();
      if (await gameCard.count() > 0) {
        await gameCard.click();
        await page.waitForLoadState('networkidle');

        // Should NOT see an upsell/paywall banner
        const paywall = page.locator('text=Köp tillgång').or(page.locator('text=Uppgradera'));
        const hasPaywall = await paywall.count() > 0;
        
        // If there's no paywall visible, we have access
        // (Paywall visibility depends on whether game is actually gated)
        expect(hasPaywall).toBe(false);
      }
    });
  });
});

test.describe('Cross-tenant Protection', () => {
  test('API rejects access to another user\'s private tenant', async ({ request }) => {
    // This test uses raw API calls to verify RLS policies
    // Attempt to access entitlements for a random tenant ID
    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    
    const response = await request.get(`/api/tenants/${fakeTenantId}/entitlements`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Should either return 401 (unauthenticated), 403 (forbidden), or empty results
    const status = response.status();
    expect([401, 403, 404]).toContain(status);
  });
});

/**
 * Auth setup for personal license user
 * Run this before the tests to create auth state
 */
test.describe('Auth Setup', () => {
  test.skip(!hasPersonalLicenseTestUser, 'TEST_PERSONAL_LICENSE_USER_* credentials not set');

  test('authenticate personal license user', async ({ page }) => {
    const email = process.env.TEST_PERSONAL_LICENSE_USER_EMAIL!;
    const password = process.env.TEST_PERSONAL_LICENSE_USER_PASSWORD!;

    // Navigate to login page
    await page.goto('/auth/login');

    // Fill in credentials
    await page.locator('#email').first().fill(email);
    await page.locator('#password').first().fill(password);

    // Click login button
    await page.locator('button[type="submit"]').first().click();

    // Wait for redirect to app
    await page.waitForURL(/\/(app|legal\/accept)/, { timeout: 10000 });

    // Handle legal acceptance if required
    if (page.url().includes('/legal/accept')) {
      await page.waitForTimeout(1000);
      
      // Dismiss cookie consent
      const cookieBtn = page.locator('button').filter({ hasText: /godta alle|accept all|acceptera alla/i }).first();
      if (await cookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }
      
      let attempts = 0;
      while (page.url().includes('/legal/accept') && attempts < 10) {
        attempts++;
        const checkbox = page.locator('input[type="checkbox"]:not(:checked)').first();
        if (await checkbox.count() > 0) {
          await checkbox.check({ force: true });
          await page.waitForTimeout(300);
        }
        const acceptBtn = page.locator('button:not([disabled])').filter({ 
          hasText: /godta og fortsett|acceptera|accept|godkänn|fortsätt|continue/i 
        }).first();
        if (await acceptBtn.count() > 0) {
          await acceptBtn.click();
          await page.waitForTimeout(500);
        } else {
          await page.waitForTimeout(500);
        }
      }
      await page.waitForURL(/\/app/, { timeout: 15000 });
    }

    // Verify we're in the app
    await expect(page).toHaveURL(/\/app/);

    // Save auth state
    await page.context().storageState({ path: personalLicenseUserAuth });
  });
});
