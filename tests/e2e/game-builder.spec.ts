import { test, expect, type Locator } from '@playwright/test';

async function selectOptionByLabel(select: Locator, label: RegExp) {
  const option = select.locator('option').filter({ hasText: label }).first();
  const value = await option.getAttribute('value');
  if (value) {
    await select.selectOption(value);
    return;
  }

  const labels = await select.locator('option').allTextContents();
  const idx = labels.findIndex((t) => label.test(t));
  if (idx >= 0) {
    await select.selectOption({ index: idx });
  }
}

/**
 * E2E Tests: Game Builder
 * 
 * Tests the game creation and editing flow:
 * 1. Create new game
 * 2. Add phases and steps
 * 3. Configure triggers
 * 4. Add artifacts
 * 5. Publish game
 */

test.describe('Game Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/games');
  });

  test('create new game with basic info', async ({ page }) => {
    // Click create
    await page.getByRole('button', { name: /create|new/i }).click();

    // Fill basic info
    await page.getByLabel(/name|title/i).fill('Builder Test Game');
    await page.getByLabel(/description/i).fill('Testing the game builder');
    
    // Set time estimate
    const timeInput = page.getByLabel(/time|duration|minutes/i);
    if (await timeInput.isVisible()) {
      await timeInput.fill('45');
    }

    // Set player count
    const minPlayers = page.getByLabel(/min.*player|minimum/i);
    if (await minPlayers.isVisible()) {
      await minPlayers.fill('2');
    }

    const maxPlayers = page.getByLabel(/max.*player|maximum/i);
    if (await maxPlayers.isVisible()) {
      await maxPlayers.fill('10');
    }

    // Save
    await page.getByRole('button', { name: /save|create/i }).click();
    await expect(page.getByText(/saved|created|success/i)).toBeVisible();
  });

  test('add phase to game', async ({ page }) => {
    // Open existing game
    await page.locator('[data-testid="game-card"]').first().click();

    // Navigate to phases tab/section
    await page.getByRole('tab', { name: /phases|structure/i }).click();

    // Add new phase
    await page.getByRole('button', { name: /add phase|new phase/i }).click();

    // Fill phase details
    await page.getByLabel(/name|title/i).fill('Introduction Phase');
    await page.getByLabel(/description/i).fill('Welcome and setup');

    // Save phase
    await page.getByRole('button', { name: /save|add|create/i }).click();

    // Verify phase added
    await expect(page.getByText('Introduction Phase')).toBeVisible();
  });

  test('add step to phase', async ({ page }) => {
    // Open game with phases
    await page.locator('[data-testid="game-card"]').first().click();
    await page.getByRole('tab', { name: /phases|structure/i }).click();

    // Expand a phase
    const phase = page.locator('[data-testid="phase-item"]').first();
    await phase.click();

    // Add step
    await page.getByRole('button', { name: /add step|new step/i }).click();

    // Fill step details
    await page.getByLabel(/title/i).fill('Welcome Message');
    
    // Select step type if available
    const stepType = page.getByLabel(/type/i);
    if (await stepType.isVisible()) {
      await selectOptionByLabel(stepType, /narrative|text/i);
    }

    // Add content
    const content = page.getByLabel(/content|text|body/i);
    if (await content.isVisible()) {
      await content.fill('Welcome to the escape room experience!');
    }

    // Save step
    await page.getByRole('button', { name: /save|add|create/i }).click();

    // Verify step added
    await expect(page.getByText('Welcome Message')).toBeVisible();
  });

  test('configure trigger', async ({ page }) => {
    // Open game
    await page.locator('[data-testid="game-card"]').first().click();
    
    // Navigate to triggers
    await page.getByRole('tab', { name: /triggers|automation/i }).click();

    // Add new trigger
    await page.getByRole('button', { name: /add trigger|new trigger/i }).click();

    // Set trigger name
    await page.getByLabel(/name|title/i).fill('Time Warning Trigger');

    // Set condition
    const conditionType = page.getByLabel(/condition.*type|when/i);
    if (await conditionType.isVisible()) {
      await selectOptionByLabel(conditionType, /time|timer/i);
    }

    // Set time threshold
    const threshold = page.getByLabel(/threshold|minutes|time/i);
    if (await threshold.isVisible()) {
      await threshold.fill('5');
    }

    // Set action
    const actionType = page.getByLabel(/action.*type|then/i);
    if (await actionType.isVisible()) {
      await selectOptionByLabel(actionType, /show.*clue|reveal/i);
    }

    // Save trigger
    await page.getByRole('button', { name: /save|add|create/i }).click();

    // Verify trigger added
    await expect(page.getByText('Time Warning Trigger')).toBeVisible();
  });

  test('add artifact', async ({ page }) => {
    // Open game
    await page.locator('[data-testid="game-card"]').first().click();
    
    // Navigate to artifacts
    await page.getByRole('tab', { name: /artifacts|assets|content/i }).click();

    // Add new artifact
    await page.getByRole('button', { name: /add artifact|new artifact/i }).click();

    // Set artifact details
    await page.getByLabel(/name|title/i).fill('Secret Code Document');
    
    const artifactType = page.getByLabel(/type/i);
    if (await artifactType.isVisible()) {
      await selectOptionByLabel(artifactType, /document|text/i);
    }

    // Add content
    const content = page.getByLabel(/content|text/i);
    if (await content.isVisible()) {
      await content.fill('The secret code is: 42');
    }

    // Save artifact
    await page.getByRole('button', { name: /save|add|create/i }).click();

    // Verify artifact added
    await expect(page.getByText('Secret Code Document')).toBeVisible();
  });

  test('publish game', async ({ page }) => {
    // Open game in draft status
    await page.locator('[data-testid="game-card"]')
      .filter({ hasText: /draft/i })
      .first()
      .click();

    // Find publish button
    await page.getByRole('button', { name: /publish/i }).click();

    // Confirm publish
    const confirmButton = page.getByRole('button', { name: /confirm|yes|publish/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify published
    await expect(page.getByText(/published/i)).toBeVisible();
  });

  test('preview game', async ({ page }) => {
    // Open game
    await page.locator('[data-testid="game-card"]').first().click();

    // Click preview
    await page.getByRole('button', { name: /preview/i }).click();

    // Should open preview mode
    await expect(page).toHaveURL(/preview/);
    
    // Preview controls should be visible
    await expect(page.getByText(/preview mode/i)).toBeVisible();
  });
});
