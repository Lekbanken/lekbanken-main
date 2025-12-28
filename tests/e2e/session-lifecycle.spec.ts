import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Session Lifecycle
 * 
 * Tests the complete flow from game creation to session end:
 * 1. Create a new game
 * 2. Start a session
 * 3. Participants join
 * 4. Progress through steps
 * 5. End session
 */

test.describe('Session Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we're authenticated
    await page.goto('/admin');
    await expect(page).toHaveURL(/admin/);
  });

  test('create game and start session', async ({ page }) => {
    // Navigate to game builder
    await page.goto('/admin/games');
    
    // Click create new game
    await page.getByRole('button', { name: /create|new game/i }).click();
    await expect(page).toHaveURL(/admin\/games\/(new|builder)/);

    // Fill in game details
    await page.getByLabel(/name|title/i).fill('E2E Test Game');
    await page.getByLabel(/description/i).fill('A game created for E2E testing');

    // Save the game
    await page.getByRole('button', { name: /save|create/i }).click();

    // Wait for success message or redirect
    await expect(page.getByText(/saved|created|success/i)).toBeVisible({ timeout: 10000 });
  });

  test('start session from game', async ({ page }) => {
    // Navigate to games list
    await page.goto('/admin/games');

    // Find and click on a game
    const gameCard = page.locator('[data-testid="game-card"]').first();
    await gameCard.click();

    // Start session button
    await page.getByRole('button', { name: /start session|run|launch/i }).click();

    // Should navigate to session page
    await expect(page).toHaveURL(/session|play/);

    // Session code should be visible
    await expect(page.getByTestId('session-code')).toBeVisible();
  });

  test('participant joins session', async ({ page, context }) => {
    // First, start a session as admin
    await page.goto('/admin/games');
    const gameCard = page.locator('[data-testid="game-card"]').first();
    await gameCard.click();
    await page.getByRole('button', { name: /start session|run|launch/i }).click();

    // Get session code
    const sessionCode = await page.getByTestId('session-code').textContent();
    expect(sessionCode).toBeTruthy();

    // Open new page as participant (anonymous)
    const participantPage = await context.newPage();
    await participantPage.goto('/');

    // Enter session code
    await participantPage.getByLabel(/code|join/i).fill(sessionCode!);
    await participantPage.getByRole('button', { name: /join/i }).click();

    // Enter participant name
    await participantPage.getByLabel(/name/i).fill('Test Participant');
    await participantPage.getByRole('button', { name: /continue|join|enter/i }).click();

    // Should be in the session
    await expect(participantPage.getByText(/waiting|ready|lobby/i)).toBeVisible();

    // Admin should see participant count increase
    await expect(page.getByText(/1 participant|1 player/i)).toBeVisible();
  });

  test('progress through session steps', async ({ page }) => {
    // Start from an active session
    await page.goto('/admin/sessions');
    
    // Find active session
    const activeSession = page.locator('[data-testid="session-row"]')
      .filter({ hasText: /active/i })
      .first();
    
    if (await activeSession.count() === 0) {
      test.skip(true, 'No active session available');
      return;
    }

    await activeSession.click();

    // Advance to next step
    await page.getByRole('button', { name: /next|advance|continue/i }).click();

    // Verify step changed
    await expect(page.getByTestId('current-step')).not.toHaveText(/step 1/i);
  });

  test('end session', async ({ page }) => {
    // Navigate to active session
    await page.goto('/admin/sessions');
    
    const activeSession = page.locator('[data-testid="session-row"]')
      .filter({ hasText: /active/i })
      .first();
    
    if (await activeSession.count() === 0) {
      test.skip(true, 'No active session available');
      return;
    }

    await activeSession.click();

    // End session
    await page.getByRole('button', { name: /end|finish|complete/i }).click();

    // Confirm dialog
    await page.getByRole('button', { name: /confirm|yes|end/i }).click();

    // Session should be marked as ended
    await expect(page.getByText(/ended|completed|finished/i)).toBeVisible();
  });
});
