import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Planner E2E Tests
 *
 * Tests the new planner IA with wizard-based plan editing.
 */

// Use regular user auth (has permission to create/edit own plans)
test.use({
  storageState: path.join(__dirname, '../.auth/regular-user.json'),
});

test.describe('Planner Navigation', () => {
  test('redirects /app/planner to /app/planner/plans', async ({ page }) => {
    await page.goto('/app/planner');
    await expect(page).toHaveURL(/\/app\/planner\/plans/);
  });

  test('shows plan library on /app/planner/plans', async ({ page }) => {
    await page.goto('/app/planner/plans');

    // Should see the tabs
    await expect(page.getByRole('navigation', { name: 'Planner navigation' })).toBeVisible();

    // Should see "Mina planer" tab as active
    await expect(page.getByRole('link', { name: /mina planer|my plans/i })).toBeVisible();

    // Should see the plan list panel
    await expect(page.getByRole('heading', { name: /mina planer|my plans/i })).toBeVisible();
  });

  test('shows calendar placeholder on /app/planner/calendar', async ({ page }) => {
    await page.goto('/app/planner/calendar');

    // Should see calendar tab as active
    await expect(page.getByRole('link', { name: /kalender|calendar/i })).toBeVisible();

    // Should see coming soon message
    await expect(page.getByText(/kalendervyn kommer snart|calendar view coming soon/i)).toBeVisible();
  });
});

test.describe('Plan Creation', () => {
  test('can create a new plan from library', async ({ page }) => {
    await page.goto('/app/planner/plans');

    // Click "Ny plan" button
    await page.getByRole('button', { name: /ny plan|new plan/i }).click();

    // Fill in the create dialog
    await page.getByLabel(/namn|name/i).fill('E2E Test Plan');
    await page.getByLabel(/beskrivning|description/i).fill('Created by E2E test');

    // Submit
    await page.getByRole('button', { name: /skapa plan|create plan/i }).click();

    // Should redirect to wizard
    await expect(page).toHaveURL(/\/app\/planner\/plan\/[\w-]+/);

    // Should be on step 1 (Grund)
    await expect(page.getByRole('heading', { name: /grund|basics/i })).toBeVisible();
  });
});

test.describe('Wizard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Create a plan first
    await page.goto('/app/planner/plans');
    await page.getByRole('button', { name: /ny plan|new plan/i }).click();
    await page.getByLabel(/namn|name/i).fill('Wizard Test Plan');
    await page.getByRole('button', { name: /skapa plan|create plan/i }).click();
    await expect(page).toHaveURL(/\/app\/planner\/plan\/[\w-]+/);
  });

  test('can navigate through wizard steps', async ({ page }) => {
    // Step 1: Grund
    await expect(page.getByRole('heading', { name: /grund|basics/i })).toBeVisible();

    // Click continue
    await page.getByRole('button', { name: /fortsätt till block|continue to blocks/i }).click();

    // Step 2: Bygg plan
    await expect(page).toHaveURL(/\?step=bygg/);
    await expect(page.getByRole('heading', { name: /bygg plan|build plan/i })).toBeVisible();

    // Click continue
    await page.getByRole('button', { name: /fortsätt till anteckningar|continue to notes/i }).click();

    // Step 3: Anteckningar
    await expect(page).toHaveURL(/\?step=anteckningar/);
    await expect(page.getByRole('heading', { name: /anteckningar|notes/i })).toBeVisible();

    // Click continue
    await page.getByRole('button', { name: /fortsätt till granskning|continue to review/i }).click();

    // Step 4: Granska
    await expect(page).toHaveURL(/\?step=granska/);
    await expect(page.getByRole('heading', { name: /granska|review/i })).toBeVisible();
  });

  test('preserves step on page refresh', async ({ page }) => {
    // Navigate to step 2
    await page.getByRole('button', { name: /fortsätt till block|continue to blocks/i }).click();
    await expect(page).toHaveURL(/\?step=bygg/);

    // Refresh the page
    await page.reload();

    // Should still be on step 2
    await expect(page).toHaveURL(/\?step=bygg/);
    await expect(page.getByRole('heading', { name: /bygg plan|build plan/i })).toBeVisible();
  });

  test('can navigate back with browser back button', async ({ page }) => {
    // Go to step 2
    await page.getByRole('button', { name: /fortsätt till block|continue to blocks/i }).click();
    await expect(page).toHaveURL(/\?step=bygg/);

    // Use browser back
    await page.goBack();

    // Should be back on step 1
    await expect(page).toHaveURL(/\/app\/planner\/plan\/[\w-]+$/);
    await expect(page.getByRole('heading', { name: /grund|basics/i })).toBeVisible();
  });

  test('can deep link to specific step', async ({ page }) => {
    // Get current URL and add step param
    const url = page.url();
    await page.goto(url + '?step=anteckningar');

    // Should be on step 3
    await expect(page.getByRole('heading', { name: /anteckningar|notes/i })).toBeVisible();
  });
});

test.describe('Step 1: Grund', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/planner/plans');
    await page.getByRole('button', { name: /ny plan|new plan/i }).click();
    await page.getByLabel(/namn|name/i).fill('Step 1 Test Plan');
    await page.getByRole('button', { name: /skapa plan|create plan/i }).click();
    await expect(page).toHaveURL(/\/app\/planner\/plan\/[\w-]+/);
  });

  test('can edit plan name and description', async ({ page }) => {
    // Update name
    const nameInput = page.getByLabel(/titel|title/i);
    await nameInput.clear();
    await nameInput.fill('Updated Plan Name');

    // Update description
    const descInput = page.getByLabel(/beskrivning|description/i);
    await descInput.fill('Updated description');

    // Save button should appear
    await expect(page.getByRole('button', { name: /spara|save/i })).toBeVisible();

    // Click save
    await page.getByRole('button', { name: /spara|save/i }).click();

    // Wait for save to complete
    await expect(page.getByRole('button', { name: /sparar|saving/i })).toBeHidden({ timeout: 5000 });
  });

  test('can change visibility', async ({ page }) => {
    // Find visibility select
    const visibilitySelect = page.locator('#plan-visibility');
    await expect(visibilitySelect).toBeVisible();

    // Change to tenant
    await visibilitySelect.selectOption('tenant');

    // Should show organization description
    await expect(page.getByText(/alla i din organisation|everyone in your organization/i)).toBeVisible();
  });
});

test.describe('Tab Navigation', () => {
  test('Planera tab is disabled when no plan selected', async ({ page }) => {
    await page.goto('/app/planner/plans');

    // "Planera" tab should be disabled (span, not link)
    const planeraTab = page.getByText(/^planera$|^plan$/i);
    await expect(planeraTab).toBeVisible();

    // Should not be clickable (it's a span when disabled)
    await expect(planeraTab).toHaveClass(/cursor-not-allowed/);
  });

  test('can navigate between tabs', async ({ page }) => {
    // First create a plan so Planera tab becomes active
    await page.goto('/app/planner/plans');
    await page.getByRole('button', { name: /ny plan|new plan/i }).click();
    await page.getByLabel(/namn|name/i).fill('Tab Test Plan');
    await page.getByRole('button', { name: /skapa plan|create plan/i }).click();

    // Now we're on the wizard, Planera tab should be active
    await expect(page).toHaveURL(/\/app\/planner\/plan\//);

    // Click on Mina planer tab
    await page.getByRole('link', { name: /mina planer|my plans/i }).click();
    await expect(page).toHaveURL(/\/app\/planner\/plans/);

    // Click on Calendar tab
    await page.getByRole('link', { name: /kalender|calendar/i }).click();
    await expect(page).toHaveURL(/\/app\/planner\/calendar/);
  });
});

test.describe('Share Link Behavior', () => {
  test('owner accessing share link redirects to wizard', async ({ page }) => {
    // Create a plan
    await page.goto('/app/planner/plans');
    await page.getByRole('button', { name: /ny plan|new plan/i }).click();
    await page.getByLabel(/namn|name/i).fill('Share Link Test');
    await page.getByRole('button', { name: /skapa plan|create plan/i }).click();

    // Extract plan ID from wizard URL
    await expect(page).toHaveURL(/\/app\/planner\/plan\/([\w-]+)/);
    const wizardUrl = page.url();
    const planId = wizardUrl.match(/\/plan\/([\w-]+)/)?.[1];
    expect(planId).toBeTruthy();

    // Navigate to share link URL
    await page.goto(`/app/planner/${planId}`);

    // Should redirect to wizard (owner has edit permission)
    await expect(page).toHaveURL(/\/app\/planner\/plan\//);
  });
});
