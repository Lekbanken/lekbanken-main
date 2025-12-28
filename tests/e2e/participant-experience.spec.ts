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

    // Find join form
    const codeInput = page.getByLabel(/code|session/i);
    await expect(codeInput).toBeVisible();

    // Enter a code (this would need an actual session)
    await codeInput.fill('ABC123');
    await page.getByRole('button', { name: /join/i }).click();

    // Either success or error (depends on test data)
    const response = page.locator('[role="alert"], [data-testid="join-form"]');
    await expect(response).toBeVisible();
  });

  test('participant lobby experience', async ({ page }) => {
    // Assuming we have a test session running
    await page.goto('/play/test-session');

    // Should see waiting room or game content
    const content = page.locator('[data-testid="lobby"], [data-testid="game-content"]');
    await expect(content).toBeVisible();
    
    // Participant name should be visible if joined
    const nameInput = page.getByLabel(/name|display name/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Player');
      await page.getByRole('button', { name: /continue|join|enter/i }).click();
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

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // First focusable element should be focused
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Continue tabbing
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const newFocused = page.locator(':focus');
      await expect(newFocused).toBeVisible();
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

    // Content should still be visible and accessible
    const content = page.locator('[data-testid="step-content"], [data-testid="game-content"]');
    if (await content.count() > 0) {
      await expect(content.first()).toBeVisible();
    }

    // Navigation should be accessible (possibly in hamburger menu)
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
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
