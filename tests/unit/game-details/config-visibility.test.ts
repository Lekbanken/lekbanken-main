/**
 * Contract test: GameDetails config security boundaries
 *
 * Verifies that section visibility config correctly hides
 * facilitator/host-only sections from preview mode.
 *
 * Findings addressed: F1, F12
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { getSectionConfig, SECTION_VISIBILITY } from '@/components/game/GameDetails/config';

describe('GameDetails config security boundaries', () => {
  describe('leaderTips visibility', () => {
    it('preview mode hides leaderTips for basic playMode', () => {
      expect(getSectionConfig('preview', 'basic').leaderTips).toBe(false);
    });

    it('preview mode hides leaderTips for facilitated playMode', () => {
      expect(getSectionConfig('preview', 'facilitated').leaderTips).toBe(false);
    });

    it('preview mode hides leaderTips for participants playMode', () => {
      expect(getSectionConfig('preview', 'participants').leaderTips).toBe(false);
    });

    it('preview mode hides leaderTips when playMode is null', () => {
      expect(getSectionConfig('preview', null).leaderTips).toBe(false);
    });

    it('preview mode hides leaderTips when playMode is undefined', () => {
      expect(getSectionConfig('preview').leaderTips).toBe(false);
    });

    it('host mode shows leaderTips', () => {
      expect(getSectionConfig('host', 'basic').leaderTips).toBe(true);
    });

    it('admin mode shows leaderTips', () => {
      expect(getSectionConfig('admin', 'basic').leaderTips).toBe(true);
    });
  });

  describe('mode completeness', () => {
    it('all modes have identical section keys', () => {
      const referenceKeys = Object.keys(SECTION_VISIBILITY.preview).sort();
      for (const [mode, config] of Object.entries(SECTION_VISIBILITY)) {
        expect(Object.keys(config).sort(), `mode "${mode}" has different keys`).toEqual(referenceKeys);
      }
    });
  });

  describe('preview mode does not expose admin actions', () => {
    it('preview hides adminActions across all playModes', () => {
      expect(getSectionConfig('preview', 'basic').adminActions).toBe(false);
      expect(getSectionConfig('preview', 'facilitated').adminActions).toBe(false);
      expect(getSectionConfig('preview', 'participants').adminActions).toBe(false);
    });
  });
});
