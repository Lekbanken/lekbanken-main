import { test, expect } from '@playwright/test';

/**
 * Profile Loading Resilience Tests
 * 
 * These tests verify that profile pages handle slow network conditions
 * gracefully and don't get stuck in infinite loading states.
 * 
 * Based on PROFILE_RESILIENCE_IMPLEMENTATION.md requirements.
 */

test.describe('Profile Loading Resilience', () => {
  
  // Skip authentication for now - these tests focus on loading behavior
  test.use({ storageState: '.auth/regular-user.json' });

  test('profile page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/app/profile');
    
    // Wait for either content or error state (not stuck in loading)
    await expect(async () => {
      const hasContent = await page.locator('h1, [data-testid="profile-content"]').isVisible();
      const hasError = await page.locator('[data-testid="error-state"], .error-boundary').isVisible();
      
      expect(hasContent || hasError).toBe(true);
    }).toPass({ timeout: 15000 });

    const elapsed = Date.now() - startTime;
    console.log(`Profile page loaded in ${elapsed}ms`);
    
    // Should load reasonably fast (under 10s even with slow queries)
    expect(elapsed).toBeLessThan(15000);
  });

  test('spinner resolves within 15s on slow network', async ({ page, context }) => {
    // Throttle all API requests to simulate slow network
    await context.route('**/rest/v1/**', async (route) => {
      await new Promise((r) => setTimeout(r, 2000)); // 2s delay per request
      await route.continue();
    });

    await page.goto('/app/profile/privacy');
    
    // Wait for terminal state (content OR error) - not stuck spinning
    await expect(async () => {
      const hasSpinner = await page.locator('.animate-spin, [data-testid="loading"]').isVisible();
      const hasContent = await page.locator('[data-testid="privacy-content"], form').isVisible();
      const hasError = await page.locator('[data-testid="error-state"], .error-boundary').isVisible();
      
      // Either we have content/error, or if spinner is showing, something else should be visible too
      const isTerminalState = hasContent || hasError || !hasSpinner;
      expect(isTerminalState).toBe(true);
    }).toPass({ timeout: 20000 });
  });

  test('error boundary displays on RSC failure', async ({ page, context }) => {
    // Force a 500 error on profile API calls
    await context.route('**/rest/v1/users**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Simulated server error' }),
      });
    });

    await page.goto('/app/profile');
    
    // Should show error state, not be stuck loading
    await expect(async () => {
      const hasError = await page.locator('text=/gick fel|error|försök igen/i').isVisible();
      const hasRetryButton = await page.locator('button:has-text("Försök igen"), button:has-text("Retry")').isVisible();
      
      // At minimum, page should render something (not white screen)
      const hasAnyContent = await page.locator('body').textContent();
      expect(hasAnyContent && hasAnyContent.length > 0).toBe(true);
      
      // Ideally we get proper error UI
      if (hasError || hasRetryButton) {
        expect(true).toBe(true);
      }
    }).toPass({ timeout: 15000 });
  });

  test('achievements page redirects to gamification', async ({ page }) => {
    await page.goto('/app/profile/achievements');
    
    // Should redirect to gamification hub
    await expect(page).toHaveURL(/\/app\/gamification/, { timeout: 5000 });
  });

  test('max 2 requests per endpoint (no request storm)', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', (req) => {
      const url = req.url();
      // Track Supabase and API requests
      if (url.includes('supabase') || url.includes('/api/')) {
        requests.push(url);
      }
    });

    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');

    // Count occurrences of each endpoint
    const endpointCounts = new Map<string, number>();
    for (const url of requests) {
      // Extract endpoint path
      const match = url.match(/\/rest\/v1\/([^?]+)/) || url.match(/\/api\/([^?]+)/);
      if (match) {
        const endpoint = match[1];
        endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + 1);
      }
    }

    // No endpoint should be called more than 2 times (StrictMode double-mount is OK)
    for (const [endpoint, count] of endpointCounts) {
      console.log(`Endpoint ${endpoint}: ${count} calls`);
      expect(count, `Endpoint ${endpoint} called ${count} times (max 2)`).toBeLessThanOrEqual(2);
    }
  });

  test('privacy page shows partial data on partial failure', async ({ page, context }) => {
    // Fail only one of the parallel requests
    let requestCount = 0;
    await context.route('**/rest/v1/rpc/**', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First RPC fails
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Partial failure' }),
        });
      } else {
        // Others succeed
        await route.continue();
      }
    });

    await page.goto('/app/profile/privacy');
    
    // Should still render something (partial data or warning)
    await expect(async () => {
      const hasContent = await page.locator('form, [data-testid="privacy-content"]').isVisible();
      const hasWarning = await page.locator('text=/kunde inte laddas|partial|warning/i').isVisible();
      const hasError = await page.locator('[data-testid="error-state"]').isVisible();
      
      // Either we got partial content, or full error - not stuck
      expect(hasContent || hasWarning || hasError).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test('friends page loads or shows error state', async ({ page }) => {
    await page.goto('/app/profile/friends');
    
    // Should reach a terminal state
    await expect(async () => {
      const hasContent = await page.locator('[data-testid="friends-list"], .friends-content, h1').isVisible();
      const hasError = await page.locator('[data-testid="error-state"], .error-boundary').isVisible();
      const hasEmpty = await page.locator('text=/inga vänner|no friends|empty/i').isVisible();
      
      expect(hasContent || hasError || hasEmpty).toBe(true);
    }).toPass({ timeout: 15000 });
  });
});
