import { test, expect, type Page } from '@playwright/test';
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

async function dismissCookieConsent(page: Page) {
  const acceptAllButton = page.locator('button').filter({ hasText: /godta alle|accept all|acceptera alla/i }).first();
  if (await acceptAllButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await acceptAllButton.click();
  }
}

async function waitForWizard(page: Page) {
  await expect
    .poll(() => page.url(), { timeout: 30000 })
    .toMatch(/\/app\/planner\/plan\/[\w-]+(?:\?step=[\w-]+)?$/);

  await dismissCookieConsent(page);
  await expect(page.getByRole('navigation', { name: 'Planner navigation' })).toBeVisible({ timeout: 15000 });
  await expect(async () => {
    const hasPlanTab = await plannerTab(page, /plan/i).isVisible().catch(() => false);
    const hasAddBlock = await page.getByRole('button', { name: /add block|lägg till block/i }).isVisible().catch(() => false);
    const hasNotes = await page.getByRole('button', { name: /notes|anteckningar/i }).isVisible().catch(() => false);
    const hasBuildHeading = await page.getByRole('heading', { name: /build plan|bygg plan/i }).isVisible().catch(() => false);
    const hasSaveAndRunHeading = await page.getByRole('heading', { name: /save\s*&\s*run|spara\s*&\s*utför/i }).isVisible().catch(() => false);

    expect(hasPlanTab || hasBuildHeading || hasSaveAndRunHeading || hasAddBlock || hasNotes).toBe(true);
  }).toPass({ timeout: 30000 });
}

function plannerTab(page: Page, label: RegExp) {
  return page.getByRole('navigation', { name: 'Planner navigation' }).locator('[role="tab"]').filter({ hasText: label });
}

function saveAndRunCta(page: Page) {
  return page.getByRole('button', { name: /spara.*utför|save.*run/i }).last();
}

async function createPlanAndOpenWizard(page: Page, name: string, description = 'Created by E2E test') {
  await page.goto('/app/planner/plans', { waitUntil: 'domcontentloaded' });
  await dismissCookieConsent(page);

  const openCreateDialog = page.getByRole('button', { name: /ny plan|new plan/i }).first();
  const nameInput = page.locator('#plan-name');
  const descriptionInput = page.locator('#plan-description');

  await expect(openCreateDialog).toBeVisible({ timeout: 15000 });
  await expect(async () => {
    if (!(await nameInput.isVisible().catch(() => false))) {
      await openCreateDialog.click({ force: true });
    }

    expect(await nameInput.isVisible().catch(() => false)).toBe(true);
  }).toPass({ timeout: 15000 });

  await nameInput.fill(name);
  await descriptionInput.fill(description);
  await page.getByRole('button', { name: /skapa plan|create plan/i }).click();

  await waitForWizard(page);
}

test.beforeEach(async ({ page }) => {
  await dismissCookieConsent(page);
});

test.describe('Planner Navigation', () => {
  test('redirects /app/planner to /app/planner/plans', async ({ page }) => {
    await page.goto('/app/planner');
    await expect(page).toHaveURL(/\/app\/planner\/plans/);
  });

  test('shows plan library on /app/planner/plans', async ({ page }) => {
    await page.goto('/app/planner/plans');
    await dismissCookieConsent(page);

    // Should see the tabs
    await expect(page.getByRole('navigation', { name: 'Planner navigation' })).toBeVisible();

    // Should see "Mina planer" tab as active
    await expect(plannerTab(page, /mina planer|my plans/i)).toBeVisible();
    await expect(plannerTab(page, /mina planer|my plans/i)).toHaveAttribute('aria-selected', 'true');

    // Should see the plan list panel
    await expect(page.getByRole('heading', { name: /mina planer|my plans/i })).toBeVisible();
  });

  test('shows calendar view on /app/planner/calendar', async ({ page }) => {
    await page.goto('/app/planner/calendar');
    await dismissCookieConsent(page);

    // Should see calendar tab as active
    await expect(plannerTab(page, /kalender|calendar/i)).toBeVisible();
    await expect(plannerTab(page, /kalender|calendar/i)).toHaveAttribute('aria-selected', 'true');

    // Feature-flagged local environments may render either the live calendar or the placeholder.
    await expect(async () => {
      const hasLiveCalendar = await page.getByRole('heading', { name: /calendar|kalender/i }).isVisible().catch(() => false);
      const hasPlaceholder = await page.getByText(/kalendervyn kommer snart|calendar view coming soon/i).isVisible().catch(() => false);
      const hasDayPrompt = await page.getByText(/select a day|klicka på en dag/i).isVisible().catch(() => false);
      expect(hasLiveCalendar && (hasPlaceholder || hasDayPrompt)).toBe(true);
    }).toPass({ timeout: 15000 });
  });
});

test.describe('Plan Creation', () => {
  test('can create a new plan from library', async ({ page }) => {
    await createPlanAndOpenWizard(page, `E2E Test Plan ${Date.now()}`);
    await expect(page.getByRole('heading', { name: /build plan|bygg plan/i })).toBeVisible();
  });
});

test.describe('Wizard Navigation', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await createPlanAndOpenWizard(page, `Wizard Test Plan ${Date.now()}`);
  });

  test('can navigate through wizard steps', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /bygg plan|build plan/i })).toBeVisible();

    await saveAndRunCta(page).click();

    await page.waitForURL(/\?step=save-and-run/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /spara.*utför|save.*run/i })).toBeVisible({ timeout: 30000 });
  });

  test('preserves step on page refresh', async ({ page }) => {
    await saveAndRunCta(page).click();
    await page.waitForURL(/\?step=save-and-run/, { timeout: 15000 });

    await page.reload();
    await dismissCookieConsent(page);

    await expect(page).toHaveURL(/\?step=save-and-run/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /spara.*utför|save.*run/i })).toBeVisible({ timeout: 30000 });
  });

  test('can navigate back with browser back button', async ({ page }) => {
    await saveAndRunCta(page).click();
    await page.waitForURL(/\?step=save-and-run/, { timeout: 15000 });

    await page.goBack();

    await expect(page).toHaveURL(/\/app\/planner\/plan\/[\w-]+(?:\?step=build)?$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /bygg plan|build plan/i })).toBeVisible();
  });

  test('can deep link to specific step', async ({ page }) => {
    const currentUrl = new URL(page.url());
    await page.goto(`${currentUrl.pathname}?step=save-and-run`);
    await dismissCookieConsent(page);

    await expect(page.getByRole('heading', { name: /spara.*utför|save.*run/i })).toBeVisible({ timeout: 30000 });
  });

  test('legacy step URLs are resolved to new steps', async ({ page }) => {
    const currentUrl = new URL(page.url());
    await page.goto(`${currentUrl.pathname}?step=anteckningar`);
    await dismissCookieConsent(page);
    await expect(page).toHaveURL(/\?step=build/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /bygg plan|build plan/i })).toBeVisible();
  });
});

test.describe('Wizard Step Content', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await createPlanAndOpenWizard(page, `Step Test Plan ${Date.now()}`);
  });

  test('can edit plan name and description on save-and-run step', async ({ page }) => {
    await saveAndRunCta(page).click();
    await page.waitForURL(/\?step=save-and-run/, { timeout: 15000 });

    const nameInput = page.locator('#plan-name');
    await nameInput.fill('Updated Plan Name');

    const descInput = page.locator('#plan-description');
    await descInput.fill('Updated description');

    const saveButton = page.getByRole('button', { name: /^spara$|^save$/i });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByRole('button', { name: /sparar|saving/i })).toBeVisible({ timeout: 10000 });
    await expect(nameInput).toHaveValue('Updated Plan Name');
  });

  test('can open notes on build step', async ({ page }) => {
    await page.getByRole('button', { name: /notes|anteckningar/i }).click();
    await expect(page.getByLabel(/private notes|privata anteckningar/i)).toBeVisible();
  });
});

test.describe('Tab Navigation', () => {
  test.describe.configure({ timeout: 60000 });

  test('Planera tab is disabled when no plan selected', async ({ page }) => {
    await page.goto('/app/planner/plans');
    await dismissCookieConsent(page);

    const planeraTab = page.getByRole('navigation', { name: 'Planner navigation' }).locator('[role="tab"][disabled]');
    await expect(planeraTab).toBeVisible();
    await expect(planeraTab).toBeDisabled();
  });

  test('can navigate between tabs', async ({ page }) => {
    await createPlanAndOpenWizard(page, `Tab Test Plan ${Date.now()}`);

    await plannerTab(page, /mina planer|my plans/i).click({ force: true });
    await expect(page).toHaveURL(/\/app\/planner\/plans/, { timeout: 15000 });

    await plannerTab(page, /kalender|calendar/i).click({ force: true });
    await expect(page).toHaveURL(/\/app\/planner\/calendar/, { timeout: 15000 });
  });
});

test.describe('Share Link Behavior', () => {
  test.describe.configure({ timeout: 60000 });

  test('owner accessing share link redirects to wizard', async ({ page }) => {
    await createPlanAndOpenWizard(page, `Share Link Test ${Date.now()}`);
    const wizardUrl = page.url();
    const planId = wizardUrl.match(/\/plan\/([\w-]+)/)?.[1];
    expect(planId).toBeTruthy();

    await page.goto(`/app/planner/${planId}`, { waitUntil: 'domcontentloaded' });
    await dismissCookieConsent(page);

    await expect(page).toHaveURL(/\/app\/planner\/plan\//, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /build plan|bygg plan/i })).toBeVisible({ timeout: 15000 });
  });
});
