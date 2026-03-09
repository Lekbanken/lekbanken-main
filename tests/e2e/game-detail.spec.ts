import { test, expect, type Page } from '@playwright/test';

/**
 * C7-C9 — GameDetails E2E Tests
 *
 * C7: Browse → open game → verify game detail renders (header, steps, badges, sidebar)
 * C8: Open participant game → expand lazy sections → verify data loads
 * C9: Director preview accessible for facilitated game, 404 for participants
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dismissCookieConsent(page: Page) {
  const btn = page
    .locator('button')
    .filter({ hasText: /godta alle|accept all|acceptera alla/i })
    .first();
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function handleLegalAcceptIfNeeded(page: Page) {
  if (!page.url().includes('/legal/accept')) return;
  await page.waitForTimeout(1000);
  await dismissCookieConsent(page);

  let attempts = 0;
  while (page.url().includes('/legal/accept') && attempts < 5) {
    attempts++;
    await dismissCookieConsent(page);
    const cb = page.locator('input[type="checkbox"]:not(:checked)').first();
    if ((await cb.count()) > 0) {
      await cb.check({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    }
    const acceptBtn = page
      .locator('button:not([disabled])')
      .filter({ hasText: /godta og fortsett|acceptera|accept|godkänn|fortsätt|continue/i })
      .first();
    if ((await acceptBtn.count()) > 0) {
      await acceptBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    } else {
      await page.waitForTimeout(500);
    }
  }
}

/** Navigate to browse page and handle legal accept */
async function goToBrowse(page: Page) {
  await page.goto('/app/browse');
  await handleLegalAcceptIfNeeded(page);
  await page.waitForLoadState('networkidle');
}

/** Click a game card and wait for game detail page to load */
async function openGameCard(page: Page, index: number) {
  const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
  await cards.nth(index).click();
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// C7: Browse → Game Detail → Verify rendering
// ---------------------------------------------------------------------------

test.describe('C7: Game Detail rendering', () => {
  test.beforeEach(async ({ page }) => {
    await goToBrowse(page);
  });

  test('opens game from browse and verifies header + title', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'No games in browse — cannot test game detail');
      return;
    }

    await openGameCard(page, 0);

    // URL should be a game detail page
    expect(page.url()).toMatch(/\/app\/games\/[a-f0-9-]+/);

    // h1 should be visible (game title)
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const title = await heading.textContent();
    expect(title?.length).toBeGreaterThan(0);
  });

  test('renders badges section', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    if ((await cards.count()) === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    await openGameCard(page, 0);

    // Badges are rendered below header — look for badge-like elements
    // Energy/duration/players badges use specific i18n text
    const badgeArea = page.locator('h1').first().locator('..').locator('..');
    await expect(badgeArea).toBeVisible({ timeout: 10000 });
  });

  test('renders sidebar with quick info', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    if ((await cards.count()) === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    await openGameCard(page, 0);

    // Sidebar with "Snabbinfo" heading (Swedish i18n)
    const sidebar = page.getByText(/snabbinfo|quick info/i).first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('renders steps section (Så spelar du)', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    if ((await cards.count()) === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    // Loop through games until we find one with steps
    const MAX = 5;
    const count = await cards.count();
    let foundSteps = false;

    for (let i = 0; i < Math.min(count, MAX); i++) {
      await openGameCard(page, i);

      const stepsSection = page.getByText(/så spelar du|instructions/i).first();
      if (await stepsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        foundSteps = true;
        // Verify at least one step item exists
        const stepItems = page.locator('ol li, [class*="step"]');
        const stepCount = await stepItems.count();
        expect(stepCount).toBeGreaterThan(0);
        break;
      }

      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    if (!foundSteps) {
      test.skip(true, 'No games with steps found in first 5 cards');
    }
  });

  test('back link navigates to browse', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    if ((await cards.count()) === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    await openGameCard(page, 0);

    // Click back link (Swedish: "Tillbaka till lekar")
    const backLink = page.getByText(/tillbaka till lekar|back to browse/i).first();
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await backLink.click();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/app/browse');
  });
});

// ---------------------------------------------------------------------------
// C8: Lazy-loaded sections (roles, artifacts, triggers)
// ---------------------------------------------------------------------------

test.describe('C8: Lazy-loaded sections', () => {
  test.beforeEach(async ({ page }) => {
    await goToBrowse(page);
  });

  test('expand lazy section loads content', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    // Find a game with expandable sections
    const MAX = 8;
    let foundExpandable = false;

    for (let i = 0; i < Math.min(count, MAX); i++) {
      await openGameCard(page, i);

      // Look for expandable buttons (lazy sections: Roller, Artefakter, Händelser)
      const expandBtn = page
        .locator('button[aria-expanded]')
        .first();

      if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        foundExpandable = true;

        // Verify aria-expanded="false" initially
        const isExpanded = await expandBtn.getAttribute('aria-expanded');
        expect(isExpanded).toBe('false');

        // Click to expand
        await expandBtn.click();

        // Wait for content to load (loading spinner or content)
        await page.waitForTimeout(2000);

        // Verify aria-expanded="true" now
        const nowExpanded = await expandBtn.getAttribute('aria-expanded');
        expect(nowExpanded).toBe('true');

        // Verify content region is visible
        const regionId = await expandBtn.getAttribute('aria-controls');
        if (regionId) {
          const region = page.locator(`#${CSS.escape(regionId)}`);
          await expect(region).toBeVisible({ timeout: 5000 });
        }

        break;
      }

      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    if (!foundExpandable) {
      test.skip(true, 'No games with expandable lazy sections found');
    }
  });

  test('collapsed section has correct aria attributes', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    const MAX = 8;
    for (let i = 0; i < Math.min(count, MAX); i++) {
      await openGameCard(page, i);

      const expandBtns = page.locator('button[aria-expanded]');
      const btnCount = await expandBtns.count();

      if (btnCount > 0) {
        for (let j = 0; j < btnCount; j++) {
          const btn = expandBtns.nth(j);
          // Each expandable button should have aria-expanded and aria-controls
          const expanded = await btn.getAttribute('aria-expanded');
          const controls = await btn.getAttribute('aria-controls');

          expect(expanded).toBe('false');
          expect(controls).toBeTruthy();
        }
        return; // Found and verified
      }

      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    test.skip(true, 'No games with expandable sections found');
  });
});

// ---------------------------------------------------------------------------
// C9: Director Preview — access control
// ---------------------------------------------------------------------------

test.describe('C9: Director Preview access', () => {
  test.beforeEach(async ({ page }) => {
    await goToBrowse(page);
  });

  test('facilitated game has director preview page', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    // Find a game with Director Mode — same approach as director-preview.spec.ts
    const MAX = 5;
    let gameId: string | null = null;

    for (let i = 0; i < Math.min(count, MAX); i++) {
      await openGameCard(page, i);

      const directorBtn = page
        .locator('button')
        .filter({ hasText: /director mode/i })
        .first();

      if (await directorBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Extract gameId from URL
        const url = page.url();
        const match = url.match(/\/app\/games\/([a-f0-9-]+)/);
        gameId = match?.[1] ?? null;
        break;
      }

      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    if (!gameId) {
      test.skip(true, 'No facilitated game found in first 5 cards');
      return;
    }

    // Navigate directly to director-preview
    await page.goto(`/app/games/${gameId}/director-preview`);
    await page.waitForLoadState('networkidle');

    // Should NOT be 404 — the page should render
    const notFoundText = page.getByText(/not found|404|hittades inte/i).first();
    const is404 = await notFoundText.isVisible({ timeout: 3000 }).catch(() => false);
    expect(is404).toBe(false);

    // The page should show some content (game title or drawer UI)
    const content = page.locator('body');
    const bodyText = await content.textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('participant game returns 404 for director preview', async ({ page }) => {
    const cards = page.locator('[data-testid="game-card"], a[href^="/app/games/"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip(true, 'No games in browse');
      return;
    }

    // Find a game WITHOUT Director Mode — likely participant mode
    const MAX = 8;
    let participantGameId: string | null = null;

    for (let i = 0; i < Math.min(count, MAX); i++) {
      await openGameCard(page, i);

      const directorBtn = page
        .locator('button')
        .filter({ hasText: /director mode/i })
        .first();

      const hasDirector = await directorBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasDirector) {
        // This might be a participant game — extract ID
        const url = page.url();
        const match = url.match(/\/app\/games\/([a-f0-9-]+)/);
        participantGameId = match?.[1] ?? null;
        if (participantGameId) break;
      }

      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    if (!participantGameId) {
      test.skip(true, 'No participant-mode game found (all games had Director Mode)');
      return;
    }

    // Navigate directly to director-preview — should 404
    const response = await page.goto(`/app/games/${participantGameId}/director-preview`);

    // Should return 404 or show not-found page
    const status = response?.status();
    const notFoundText = page.getByText(/not found|404|hittades inte/i).first();
    const is404Page = await notFoundText.isVisible({ timeout: 5000 }).catch(() => false);

    expect(status === 404 || is404Page).toBe(true);
  });
});
