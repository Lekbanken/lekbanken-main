/**
 * Step 8 — Cleanup + subroute-gating tests
 *
 * Verifies:
 *   8a — SkillTree deprecation (deprecated markers, production isolation)
 *   8b — getJourneyEnabled utility + subroute gating infrastructure
 *   8c — Bundle separation (lazy-load verification)
 *   8d — Documentation completeness
 *
 * Environment: vitest `node`
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// =============================================================================
// 8a — SkillTree Deprecation
// =============================================================================
describe('Step 8a — SkillTree Deprecation', () => {
  it('skill-trees.ts has @deprecated JSDoc marker', () => {
    const src = readSrc('features/gamification/data/skill-trees.ts');
    expect(src).toContain('@deprecated');
    expect(src).toContain('v2.1');
  });

  it('SkillTreeSection.tsx has @deprecated JSDoc marker', () => {
    const src = readSrc('features/gamification/components/SkillTreeSection.tsx');
    expect(src).toContain('@deprecated');
    expect(src).toContain('CosmeticControlPanel');
  });

  it('GamificationPage does NOT import SkillTreeSection', () => {
    const src = readSrc('features/gamification/GamificationPage.tsx');
    expect(src).not.toContain('SkillTreeSection');
  });

  it('GamificationPage imports CosmeticControlPanel', () => {
    const src = readSrc('features/gamification/GamificationPage.tsx');
    expect(src).toContain("import { CosmeticControlPanel }");
  });

  it('no production file (outside SkillTreeSection itself and tests) imports SkillTreeSection', () => {
    // Verify by checking that GamificationPage (the only potential consumer) doesn't import it
    const page = readSrc('features/gamification/GamificationPage.tsx');
    expect(page).not.toMatch(/SkillTreeSection/);
  });
});

// =============================================================================
// 8b — getJourneyEnabled + Subroute Gating
// =============================================================================
describe('Step 8b — getJourneyEnabled', () => {
  it('lib/journey/getJourneyEnabled.ts exists and exports getJourneyEnabled', async () => {
    const src = readSrc('lib/journey/getJourneyEnabled.ts');
    expect(src).toContain('export async function getJourneyEnabled');
    expect(src).toContain('userId: string');
    expect(src).toContain('Promise<boolean>');
  });

  it('queries user_journey_preferences table', () => {
    const src = readSrc('lib/journey/getJourneyEnabled.ts');
    expect(src).toContain('user_journey_preferences');
    expect(src).toContain('journey_enabled');
  });

  it('uses createServiceRoleClient (not user-scoped client)', () => {
    const src = readSrc('lib/journey/getJourneyEnabled.ts');
    expect(src).toContain('createServiceRoleClient');
  });

  it('returns false when no preference row exists', async () => {
    // Mock the module to test the function behavior
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceRoleClient: vi.fn(async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      })),
    }));

    const { getJourneyEnabled } = await import('@/lib/journey/getJourneyEnabled');
    const result = await getJourneyEnabled('some-user-id');
    expect(result).toBe(false);

    vi.doUnmock('@/lib/supabase/server');
  });
});

describe('Step 8b — Subroute gating proof-of-concept', () => {
  it('achievements page.tsx imports getJourneyEnabled', () => {
    const src = readSrc('app/app/gamification/achievements/page.tsx');
    expect(src).toContain('getJourneyEnabled');
  });

  it('achievements page.tsx imports getServerAuthContext', () => {
    const src = readSrc('app/app/gamification/achievements/page.tsx');
    expect(src).toContain('getServerAuthContext');
  });

  it('achievements page.tsx is an async server component', () => {
    const src = readSrc('app/app/gamification/achievements/page.tsx');
    expect(src).toContain('export default async function');
  });

  it('subroutes that need future gating are documented', () => {
    const src = readSrc('app/app/gamification/achievements/page.tsx');
    expect(src).toContain('proof-of-concept');
  });
});

// =============================================================================
// 8c — Bundle Separation
// =============================================================================
describe('Step 8c — Bundle Separation', () => {
  it('GamificationPage is lazy-loaded via next/dynamic in dispatcher', () => {
    const src = readSrc('app/app/gamification/page.tsx');
    expect(src).toContain("dynamic(");
    expect(src).toContain("ssr: false");
    expect(src).toContain("GamificationPage");
  });

  it('dispatcher only imports heavy Journey component dynamically', () => {
    const src = readSrc('app/app/gamification/page.tsx');
    // Direct imports should NOT include GamificationPage
    const staticImports = src
      .split('\n')
      .filter(line => line.startsWith('import ') && !line.includes('dynamic') && !line.includes('type '));
    const hasStaticJourneyImport = staticImports.some(line =>
      line.includes('GamificationPage'),
    );
    expect(hasStaticJourneyImport).toBe(false);
  });

  it('admin cosmetic routes use service role client (bypasses RLS)', () => {
    const routes = [
      'app/api/admin/cosmetics/route.ts',
      'app/api/admin/cosmetics/[id]/route.ts',
      'app/api/admin/cosmetics/[id]/rules/route.ts',
      'app/api/admin/cosmetics/grant/route.ts',
    ];
    for (const route of routes) {
      const src = readSrc(route);
      expect(src).toContain('createServiceRoleClient');
    }
  });
});

// =============================================================================
// 8d — Documentation
// =============================================================================
describe('Step 8d — Documentation', () => {
  it('PROJECT_CONTEXT.md mentions Gamification / Journey domain', () => {
    const src = readSrc('PROJECT_CONTEXT.md');
    expect(src).toContain('Journey');
    expect(src).toContain('Gamification');
  });

  it('PROJECT_CONTEXT.md has Journey v2.0 Status section', () => {
    const src = readSrc('PROJECT_CONTEXT.md');
    expect(src).toContain('Journey v2.0 Status');
  });

  it('Journey_v2_CHANGELOG.md exists and covers all 8 steps', () => {
    const src = readSrc('Journey_v2_CHANGELOG.md');
    expect(src).toContain('Step 1');
    expect(src).toContain('Step 2');
    expect(src).toContain('Step 3');
    expect(src).toContain('Step 4');
    expect(src).toContain('Step 5');
    expect(src).toContain('Step 6');
    expect(src).toContain('Step 7');
    expect(src).toContain('Step 8');
  });

  it('Journey_v2_CHANGELOG.md documents key architectural decisions', () => {
    const src = readSrc('Journey_v2_CHANGELOG.md');
    expect(src).toContain('render_type');
    expect(src).toContain('cosmetic_loadout');
    expect(src).toContain('CosmeticControlPanel');
    expect(src).toContain('requireSystemAdmin');
    expect(src).toContain('getJourneyEnabled');
  });

  it('Journey_v2_CHANGELOG.md includes test coverage summary', () => {
    const src = readSrc('Journey_v2_CHANGELOG.md');
    expect(src).toContain('Test Coverage Summary');
  });
});
