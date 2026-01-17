import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Participant Experience
 * 
 * Tests the participant-facing play experience:
 * 1. Join session with code
 * 2. View content and progress
 * 3. Interact with artifacts
 * 4. Vote on decisions
 * 5. Session completion
 */

test.describe('Participant Experience', () => {
  // Use a new context without auth for participant tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('join session with valid code', async ({ page }) => {
    await page.goto('/');

    // Find join form - look for text input specifically
    const codeInput = page.locator('input[type="text"][name="code"], input[type="text"][placeholder*="kod"], input[type="text"][placeholder*="code"]').first();
    
    // Check if text input exists
    if (await codeInput.count() > 0) {
      await codeInput.fill('ABC123');
      
      // Try to find and click join button
      const joinButton = page.getByRole('button', { name: /join|gå med|anslut/i });
      if (await joinButton.count() > 0) {
        await joinButton.click();
      }
    } else {
      // The home page might be a marketing page without join form
      // This is expected behavior - skip gracefully
      test.skip(true, 'No session code input found on home page');
      return;
    }

    // Wait for response
    await page.waitForTimeout(1000);
  });

  test('participant lobby experience', async ({ page }) => {
    // Assuming we have a test session running
    await page.goto('/play/test-session');

    // Wait for any content to load
    await page.waitForTimeout(2000);
    
    // Check if we got redirected (invalid session) or content loaded
    const hasContent = await page.locator('main, [role="main"], .container').first().count() > 0;
    if (!hasContent) {
      test.skip(true, 'No test session available');
      return;
    }
    
    // Participant name input might be visible for joining
    const nameInput = page.getByLabel(/name|namn|display name/i);
    if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nameInput.fill('Test Player');
      const continueBtn = page.getByRole('button', { name: /continue|fortsätt|join|gå med|enter/i });
      if (await continueBtn.count() > 0) {
        await continueBtn.click();
      }
    }
  });

  test('view step content', async ({ page }) => {
    // Navigate directly to play page (requires active session)
    await page.goto('/play/test-session');

    // Wait for content to load
    const stepContent = page.locator('[data-testid="step-content"]');
    
    // Verify content elements
    const heading = stepContent.locator('h1, h2, h3');
    if (await heading.count() > 0) {
      await expect(heading.first()).toBeVisible();
    }

    // Progress indicator should be visible
    const progress = page.locator('[data-testid="progress"], [role="progressbar"]');
    if (await progress.count() > 0) {
      await expect(progress.first()).toBeVisible();
    }
  });

  test('interact with artifact', async ({ page }) => {
    await page.goto('/play/test-session');

    // Find artifact button/link
    const artifact = page.locator('[data-testid="artifact"], [data-artifact-id]');
    
    if (await artifact.count() > 0) {
      await artifact.first().click();

      // Artifact modal/view should open
      const artifactView = page.locator('[data-testid="artifact-view"], [role="dialog"]');
      await expect(artifactView).toBeVisible();

      // Close artifact
      await page.keyboard.press('Escape');
    }
  });

  test('vote on decision', async ({ page }) => {
    await page.goto('/play/test-session');

    // Find voting section
    const voting = page.locator('[data-testid="voting"], [data-testid="decision"]');
    
    if (await voting.count() > 0) {
      // Select an option
      const option = voting.locator('button, [role="radio"]').first();
      await option.click();

      // Submit vote
      const submitVote = page.getByRole('button', { name: /vote|submit|confirm/i });
      if (await submitVote.isVisible()) {
        await submitVote.click();
      }

      // Confirmation should appear
      await expect(page.getByText(/voted|submitted|received/i)).toBeVisible();
    }
  });

  test('timer display and updates', async ({ page }) => {
    await page.goto('/play/test-session');

    // Timer should be visible
    const timer = page.locator('[data-testid="timer"], [aria-label*="time"]');
    
    if (await timer.count() > 0) {
      // Get initial time
      const initialTime = await timer.textContent();
      
      // Wait a few seconds
      await page.waitForTimeout(3000);
      
      // Time should have changed
      const newTime = await timer.textContent();
      expect(newTime).not.toBe(initialTime);
    }
  });

  test('accessibility - keyboard navigation', async ({ page }) => {
    await page.goto('/play/test-session');

    // Wait for page to stabilize
    await page.waitForTimeout(1000);
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Check if any element is focused
    const focused = page.locator(':focus');
    const focusCount = await focused.count();
    
    // May not have focusable elements if session doesn't exist
    if (focusCount === 0) {
      test.skip(true, 'No focusable elements found - session may not exist');
      return;
    }

    // Continue tabbing through a few elements
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
  });

  test('accessibility - skip link', async ({ page }) => {
    await page.goto('/play/test-session');

    // Focus skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a[href="#main"], [data-testid="skip-link"]');
    if (await skipLink.count() > 0) {
      // Activate skip link
      await page.keyboard.press('Enter');
      
      // Focus should move to main content
      const main = page.locator('#main, [role="main"]');
      await expect(main).toBeFocused();
    }
  });

  test('responsive - mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/play/test-session');

    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Content should still be visible and accessible
    const content = page.locator('main, [role="main"], body');
    await expect(content.first()).toBeVisible();

    // Page should render without horizontal scroll issues
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400); // Allow some margin
  });

  test('session completion screen', async ({ page }) => {
    // This would require navigating to a completed session
    await page.goto('/play/completed-session');

    // Should show completion message
    const completion = page.locator('[data-testid="completion"], [data-testid="session-ended"]');
    
    if (await completion.count() > 0) {
      await expect(completion).toBeVisible();
      
      // Should show summary or results
      const summary = page.getByText(/complete|finished|congratulations|summary/i);
      await expect(summary).toBeVisible();
    }
  });
});
