/**
 * C3 — Config / Visibility Matrix Tests
 *
 * Tests getSectionConfig, hasLazyLoadedSections, getVisibleSections
 * and validates the full 3 modes × 3 playModes visibility matrix.
 *
 * Target: 21 sections × 3 modes × 3 playModes = comprehensive coverage.
 */

import { describe, it, expect } from 'vitest';
import {
  getSectionConfig,
  SECTION_VISIBILITY,
  hasLazyLoadedSections,
  getVisibleSections,
  type GameDetailMode,
  type SectionVisibility,
} from '@/components/game/GameDetails/config';
import type { PlayMode } from '@/lib/game-display';

// =============================================================================
// SECTION KEYS (exhaustive list for verification)
// =============================================================================

const ALL_SECTION_KEYS: (keyof SectionVisibility)[] = [
  'header', 'badges', 'about', 'steps', 'materials', 'safety',
  'preparation', 'phases', 'gallery', 'roles', 'artifacts', 'triggers',
  'quickFacts', 'sidebar', 'adminActions', 'accessibility', 'requirements',
  'board', 'tools', 'leaderTips', 'metadata', 'outcomes',
];

const MODES: GameDetailMode[] = ['preview', 'admin', 'host'];
const PLAY_MODES: PlayMode[] = ['basic', 'facilitated', 'participants'];

// =============================================================================
// Base config structure tests
// =============================================================================

describe('SECTION_VISIBILITY base config', () => {
  it.each(MODES)('mode "%s" has all 22 section keys', (mode) => {
    const config = SECTION_VISIBILITY[mode];
    for (const key of ALL_SECTION_KEYS) {
      expect(config).toHaveProperty(key);
      expect(typeof config[key]).toBe('boolean');
    }
  });

  it.each(PLAY_MODES)('getSectionConfig accepts playMode "%s"', (pm) => {
    const config = getSectionConfig('preview', pm);
    expect(config).toBeDefined();
  });

  it('preview hides adminActions', () => {
    expect(SECTION_VISIBILITY.preview.adminActions).toBe(false);
  });

  it('admin shows adminActions', () => {
    expect(SECTION_VISIBILITY.admin.adminActions).toBe(true);
  });

  it('host hides non-gameplay sections', () => {
    const host = SECTION_VISIBILITY.host;
    expect(host.badges).toBe(false);
    expect(host.about).toBe(false);
    expect(host.preparation).toBe(false);
    expect(host.gallery).toBe(false);
    expect(host.quickFacts).toBe(false);
    expect(host.sidebar).toBe(false);
  });

  it('host shows gameplay-relevant sections', () => {
    const host = SECTION_VISIBILITY.host;
    expect(host.steps).toBe(true);
    expect(host.materials).toBe(true);
    expect(host.safety).toBe(true);
    expect(host.phases).toBe(true);
    expect(host.roles).toBe(true);
    expect(host.artifacts).toBe(true);
    expect(host.triggers).toBe(true);
  });
});

// =============================================================================
// getSectionConfig with playMode filters
// =============================================================================

describe('getSectionConfig', () => {
  // --- basic playMode ---
  describe('basic playMode', () => {
    it.each(MODES)('mode "%s" hides phases, roles, artifacts, triggers, board, tools', (mode) => {
      const config = getSectionConfig(mode, 'basic');
      expect(config.phases).toBe(false);
      expect(config.roles).toBe(false);
      expect(config.artifacts).toBe(false);
      expect(config.triggers).toBe(false);
      expect(config.board).toBe(false);
      expect(config.tools).toBe(false);
    });

    it('preview+basic still shows core sections', () => {
      const config = getSectionConfig('preview', 'basic');
      expect(config.header).toBe(true);
      expect(config.badges).toBe(true);
      expect(config.about).toBe(true);
      expect(config.steps).toBe(true);
      expect(config.materials).toBe(true);
    });
  });

  // --- facilitated playMode ---
  describe('facilitated playMode', () => {
    it.each(MODES)('mode "%s" hides roles, artifacts, triggers', (mode) => {
      const config = getSectionConfig(mode, 'facilitated');
      expect(config.roles).toBe(false);
      expect(config.artifacts).toBe(false);
      expect(config.triggers).toBe(false);
    });

    it.each(MODES)('mode "%s" shows phases', (mode) => {
      const config = getSectionConfig(mode, 'facilitated');
      // phases visible unless host already hides it (host shows phases=true in base)
      expect(config.phases).toBe(SECTION_VISIBILITY[mode].phases);
    });
  });

  // --- participants playMode ---
  describe('participants playMode', () => {
    it.each(MODES)('mode "%s" shows roles, artifacts, triggers', (mode) => {
      const config = getSectionConfig(mode, 'participants');
      // participants uses base config — lazy sections visible (if base allows)
      expect(config.roles).toBe(SECTION_VISIBILITY[mode].roles);
      expect(config.artifacts).toBe(SECTION_VISIBILITY[mode].artifacts);
      expect(config.triggers).toBe(SECTION_VISIBILITY[mode].triggers);
    });
  });

  // --- null/undefined playMode ---
  it('null playMode uses base config unchanged', () => {
    const config = getSectionConfig('preview', null);
    expect(config).toEqual(SECTION_VISIBILITY.preview);
  });

  it('undefined playMode uses base config unchanged', () => {
    const config = getSectionConfig('preview', undefined);
    expect(config).toEqual(SECTION_VISIBILITY.preview);
  });

  // --- Cross-check: does not mutate base config ---
  it('does not mutate the base SECTION_VISIBILITY config', () => {
    const before = { ...SECTION_VISIBILITY.preview };
    getSectionConfig('preview', 'basic');
    expect(SECTION_VISIBILITY.preview).toEqual(before);
  });
});

// =============================================================================
// Full matrix verification (3 modes × 3 playModes × key sections)
// =============================================================================

describe('Full visibility matrix', () => {
  const matrixExpectations: Array<{
    mode: GameDetailMode;
    playMode: PlayMode;
    sections: Partial<Record<keyof SectionVisibility, boolean>>;
  }> = [
    // Preview mode
    { mode: 'preview', playMode: 'basic', sections: { phases: false, roles: false, artifacts: false, triggers: false, board: false, tools: false, header: true, steps: true, adminActions: false } },
    { mode: 'preview', playMode: 'facilitated', sections: { phases: true, roles: false, artifacts: false, triggers: false, header: true, steps: true, board: true, tools: true } },
    { mode: 'preview', playMode: 'participants', sections: { phases: true, roles: true, artifacts: true, triggers: true, header: true, steps: true, board: true, tools: true } },
    // Admin mode
    { mode: 'admin', playMode: 'basic', sections: { phases: false, roles: false, artifacts: false, triggers: false, board: false, tools: false, adminActions: true } },
    { mode: 'admin', playMode: 'facilitated', sections: { phases: true, roles: false, artifacts: false, triggers: false, adminActions: true, board: true } },
    { mode: 'admin', playMode: 'participants', sections: { phases: true, roles: true, artifacts: true, triggers: true, adminActions: true } },
    // Host mode
    { mode: 'host', playMode: 'basic', sections: { phases: false, roles: false, artifacts: false, triggers: false, board: false, tools: false, badges: false, about: false, sidebar: false } },
    { mode: 'host', playMode: 'facilitated', sections: { phases: true, roles: false, artifacts: false, triggers: false, steps: true, safety: true } },
    { mode: 'host', playMode: 'participants', sections: { phases: true, roles: true, artifacts: true, triggers: true, steps: true } },
  ];

  it.each(matrixExpectations)(
    '$mode + $playMode has correct visibility',
    ({ mode, playMode, sections }) => {
      const config = getSectionConfig(mode, playMode);
      for (const [key, expected] of Object.entries(sections)) {
        expect(config[key as keyof SectionVisibility], `${mode}/${playMode}: ${key}`).toBe(expected);
      }
    }
  );
});

// =============================================================================
// hasLazyLoadedSections
// =============================================================================

describe('hasLazyLoadedSections', () => {
  it('returns true when roles visible', () => {
    const config = getSectionConfig('preview', 'participants');
    expect(hasLazyLoadedSections(config)).toBe(true);
  });

  it('returns false for basic playMode', () => {
    const config = getSectionConfig('preview', 'basic');
    expect(hasLazyLoadedSections(config)).toBe(false);
  });

  it('returns false for facilitated playMode', () => {
    const config = getSectionConfig('preview', 'facilitated');
    expect(hasLazyLoadedSections(config)).toBe(false);
  });
});

// =============================================================================
// getVisibleSections
// =============================================================================

describe('getVisibleSections', () => {
  it('returns only visible section keys', () => {
    const config = getSectionConfig('preview', 'basic');
    const visible = getVisibleSections(config);

    expect(visible).toContain('header');
    expect(visible).toContain('steps');
    expect(visible).not.toContain('phases');
    expect(visible).not.toContain('roles');
    expect(visible).not.toContain('adminActions');
  });

  it('admin + participants has most sections visible', () => {
    const config = getSectionConfig('admin', 'participants');
    const visible = getVisibleSections(config);

    // Admin + participants should show everything
    expect(visible).toContain('adminActions');
    expect(visible).toContain('roles');
    expect(visible).toContain('artifacts');
    expect(visible).toContain('triggers');
  });

  it('returns array of strings', () => {
    const visible = getVisibleSections(SECTION_VISIBILITY.preview);
    expect(Array.isArray(visible)).toBe(true);
    expect(visible.every(key => typeof key === 'string')).toBe(true);
  });
});

// =============================================================================
// Sprint D: leaderTips visibility
// =============================================================================

describe('leaderTips section visibility', () => {
  it('hidden in preview mode (F1: facilitator-only content)', () => {
    const config = getSectionConfig('preview', null);
    expect(config.leaderTips).toBe(false);
  });

  it('visible in admin mode', () => {
    const config = getSectionConfig('admin', null);
    expect(config.leaderTips).toBe(true);
  });

  it('visible in host mode (leader tips are relevant during hosting)', () => {
    const config = getSectionConfig('host', null);
    expect(config.leaderTips).toBe(true);
  });

  it('hidden for basic playMode in preview (F1: facilitator-only content)', () => {
    const config = getSectionConfig('preview', 'basic');
    expect(config.leaderTips).toBe(false);
  });
});

// =============================================================================
// Sprint D: metadata visibility
// =============================================================================

describe('metadata section visibility', () => {
  it('visible in preview mode', () => {
    const config = getSectionConfig('preview', null);
    expect(config.metadata).toBe(true);
  });

  it('visible in admin mode', () => {
    const config = getSectionConfig('admin', null);
    expect(config.metadata).toBe(true);
  });

  it('hidden in host mode (not needed during gameplay)', () => {
    const config = getSectionConfig('host', null);
    expect(config.metadata).toBe(false);
  });
});

// =============================================================================
// Sprint D: outcomes visibility
// =============================================================================

describe('outcomes section visibility', () => {
  it('visible in preview mode', () => {
    const config = getSectionConfig('preview', null);
    expect(config.outcomes).toBe(true);
  });

  it('visible in admin mode', () => {
    const config = getSectionConfig('admin', null);
    expect(config.outcomes).toBe(true);
  });

  it('hidden in host mode (not needed during gameplay)', () => {
    const config = getSectionConfig('host', null);
    expect(config.outcomes).toBe(false);
  });
});
