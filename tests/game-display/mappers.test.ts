/**
 * C1 — Mapper Unit Tests
 *
 * Tests all individual mapper functions from lib/game-display/mappers.ts
 * Each mapper tested for: valid input, null/undefined input, empty array, edge cases.
 *
 * Note: mapDbGameToSummary, mapDbGameToDetailPreview, mapDbGameToDetailFull
 * are covered in roundtrip.test.ts. This file tests the remaining mappers.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  mapSteps,
  mapPhases,
  mapMaterials,
  mapRoles,
  mapArtifacts,
  mapTriggers,
  mapBoardConfigToWidgets,
  mapSearchResultToSummary,
  mapPlannerBlockToSummary,
  createMinimalSummary,
  validateGameSummary,
} from '@/lib/game-display';

// =============================================================================
// mapSteps
// =============================================================================

describe('mapSteps', () => {
  it('returns empty array for undefined', () => {
    expect(mapSteps(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(mapSteps([])).toEqual([]);
  });

  it('maps step fields correctly', () => {
    const steps = mapSteps([
      {
        id: 's1',
        step_order: 1,
        title: 'Step 1',
        body: 'Description',
        duration_seconds: 180,
        display_mode: 'instant',
        optional: false,
      },
    ]);

    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe('Step 1');
    expect(steps[0].body).toBe('Description');
    expect(steps[0].durationMinutes).toBe(3); // 180s / 60
    expect(steps[0].durationSeconds).toBe(180);
    expect(steps[0].displayMode).toBe('instant');
    expect(steps[0].optional).toBe(false);
  });

  it('sorts by step_order', () => {
    const steps = mapSteps([
      { id: 's2', step_order: 2, title: 'Second' },
      { id: 's1', step_order: 1, title: 'First' },
      { id: 's3', step_order: 3, title: 'Third' },
    ]);

    expect(steps[0].title).toBe('First');
    expect(steps[1].title).toBe('Second');
    expect(steps[2].title).toBe('Third');
  });

  it('handles null step_order', () => {
    const steps = mapSteps([
      { id: 's1', title: 'No order' },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe('No order');
  });

  it('filters invalid display_mode', () => {
    const steps = mapSteps([
      { id: 's1', step_order: 1, title: 'Test', display_mode: 'invalid_mode' },
    ]);
    expect(steps[0].displayMode).toBeUndefined();
  });

  it('maps valid display modes', () => {
    for (const mode of ['instant', 'typewriter', 'dramatic']) {
      const steps = mapSteps([{ id: 's1', step_order: 1, title: 'Test', display_mode: mode }]);
      expect(steps[0].displayMode).toBe(mode);
    }
  });
});

// =============================================================================
// mapPhases
// =============================================================================

describe('mapPhases', () => {
  it('returns empty array for undefined', () => {
    expect(mapPhases(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(mapPhases([])).toEqual([]);
  });

  it('maps phase fields correctly', () => {
    const phases = mapPhases([
      {
        id: 'p1',
        name: 'Intro',
        phase_type: 'intro',
        phase_order: 1,
        duration_seconds: 300,
        description: 'Welcome',
        timer_visible: true,
        timer_style: 'countdown',
      },
    ]);

    expect(phases).toHaveLength(1);
    expect(phases[0].title).toBe('Intro');
    expect(phases[0].phaseType).toBe('intro');
    expect(phases[0].duration).toBe('5 min'); // 300s / 60
    expect(phases[0].goal).toBe('Welcome');
    expect(phases[0].timerVisible).toBe(true);
    expect(phases[0].timerStyle).toBe('countdown');
  });

  it('sorts by phase_order', () => {
    const phases = mapPhases([
      { id: 'p2', name: 'Round', phase_order: 2 },
      { id: 'p1', name: 'Intro', phase_order: 1 },
    ]);

    expect(phases[0].title).toBe('Intro');
    expect(phases[1].title).toBe('Round');
  });

  it('filters invalid phase_type', () => {
    const phases = mapPhases([
      { id: 'p1', name: 'Test', phase_order: 1, phase_type: 'invalid' },
    ]);
    expect(phases[0].phaseType).toBeUndefined();
  });

  it('accepts valid phase types', () => {
    for (const type of ['intro', 'round', 'finale', 'break']) {
      const phases = mapPhases([{ id: 'p1', name: 'Test', phase_order: 1, phase_type: type }]);
      expect(phases[0].phaseType).toBe(type);
    }
  });

  it('filters invalid timer_style', () => {
    const phases = mapPhases([
      { id: 'p1', name: 'Test', phase_order: 1, timer_style: 'invalid' },
    ]);
    expect(phases[0].timerStyle).toBeUndefined();
  });
});

// =============================================================================
// mapMaterials
// =============================================================================

describe('mapMaterials', () => {
  it('returns empty group for undefined', () => {
    expect(mapMaterials(undefined)).toEqual({ items: [] });
  });

  it('returns empty group for empty array', () => {
    expect(mapMaterials([])).toEqual({ items: [] });
  });

  it('maps items correctly', () => {
    const result = mapMaterials([
      { id: 'm1', items: ['Pen', 'Paper'], locale: 'sv' },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].label).toBe('Pen');
    expect(result.items[1].label).toBe('Paper');
  });

  it('extracts safety notes', () => {
    const result = mapMaterials([
      { id: 'm1', items: [], safety_notes: 'Be careful', locale: 'sv' },
    ]);

    expect(result.safetyNotes).toEqual(['Be careful']);
  });

  it('extracts preparation notes', () => {
    const result = mapMaterials([
      { id: 'm1', items: [], preparation: 'Prepare beforehand', locale: 'sv' },
    ]);

    expect(result.preparationNotes).toEqual(['Prepare beforehand']);
  });

  it('combines items from multiple material entries', () => {
    const result = mapMaterials([
      { id: 'm1', items: ['Pen'], locale: 'sv' },
      { id: 'm2', items: ['Paper'], locale: 'sv' },
    ]);

    expect(result.items).toHaveLength(2);
  });

  it('returns undefined for empty safety/preparation', () => {
    const result = mapMaterials([
      { id: 'm1', items: ['Pen'], locale: 'sv' },
    ]);

    expect(result.safetyNotes).toBeUndefined();
    expect(result.preparationNotes).toBeUndefined();
  });
});

// =============================================================================
// mapRoles
// =============================================================================

describe('mapRoles', () => {
  it('returns empty array for undefined', () => {
    expect(mapRoles(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(mapRoles([])).toEqual([]);
  });

  it('maps role fields correctly', () => {
    const roles = mapRoles([
      {
        id: 'r1',
        name: 'Leader',
        role_order: 1,
        color: '#FF0000',
        min_count: 1,
        max_count: 2,
        public_description: 'Leads the group',
        private_instructions: 'Secret info',
        private_hints: 'Hint text',
        assignment_strategy: 'random',
      },
    ]);

    expect(roles).toHaveLength(1);
    expect(roles[0].name).toBe('Leader');
    expect(roles[0].color).toBe('#FF0000');
    expect(roles[0].minCount).toBe(1);
    expect(roles[0].maxCount).toBe(2);
    expect(roles[0].publicNote).toBe('Leads the group');
    expect(roles[0].privateNote).toBe('Secret info');
    expect(roles[0].secrets).toEqual(['Hint text']);
    expect(roles[0].assignmentStrategy).toBe('random');
  });

  it('sorts by role_order', () => {
    const roles = mapRoles([
      { id: 'r2', name: 'Second', role_order: 2 },
      { id: 'r1', name: 'First', role_order: 1 },
    ]);

    expect(roles[0].name).toBe('First');
    expect(roles[1].name).toBe('Second');
  });

  it('filters invalid assignment_strategy', () => {
    const roles = mapRoles([
      { id: 'r1', name: 'Test', role_order: 1, assignment_strategy: 'invalid' },
    ]);
    expect(roles[0].assignmentStrategy).toBeUndefined();
  });

  it('accepts valid assignment strategies', () => {
    for (const strategy of ['random', 'leader_picks', 'player_picks']) {
      const roles = mapRoles([
        { id: 'r1', name: 'Test', role_order: 1, assignment_strategy: strategy },
      ]);
      expect(roles[0].assignmentStrategy).toBe(strategy);
    }
  });
});

// =============================================================================
// mapArtifacts
// =============================================================================

describe('mapArtifacts', () => {
  it('returns empty array for undefined', () => {
    expect(mapArtifacts(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(mapArtifacts([])).toEqual([]);
  });

  it('maps artifact fields correctly', () => {
    const artifacts = mapArtifacts([
      {
        id: 'a1',
        title: 'Secret card',
        description: 'A hidden card',
        artifact_type: 'card',
        artifact_order: 1,
        tags: ['mystery'],
      },
    ]);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].title).toBe('Secret card');
    expect(artifacts[0].description).toBe('A hidden card');
    expect(artifacts[0].type).toBe('card');
    expect(artifacts[0].tags).toEqual(['mystery']);
  });

  it('sorts by artifact_order', () => {
    const artifacts = mapArtifacts([
      { id: 'a2', title: 'Second', artifact_order: 2 },
      { id: 'a1', title: 'First', artifact_order: 1 },
    ]);

    expect(artifacts[0].title).toBe('First');
    expect(artifacts[1].title).toBe('Second');
  });

  it('maps variants with sorting and visibility', () => {
    const artifacts = mapArtifacts([
      {
        id: 'a1',
        title: 'Card',
        artifact_order: 1,
        variants: [
          { id: 'v2', title: 'Variant B', variant_order: 2, visibility: 'public' },
          { id: 'v1', title: 'Variant A', variant_order: 1, visibility: 'leader_only' },
        ],
      },
    ]);

    expect(artifacts[0].variants).toHaveLength(2);
    expect(artifacts[0].variants![0].title).toBe('Variant A');
    expect(artifacts[0].variants![0].visibility).toBe('leader_only');
    expect(artifacts[0].variants![1].title).toBe('Variant B');
    expect(artifacts[0].variants![1].visibility).toBe('public');
  });

  it('filters invalid variant visibility', () => {
    const artifacts = mapArtifacts([
      {
        id: 'a1',
        title: 'Card',
        artifact_order: 1,
        variants: [
          { id: 'v1', title: 'Test', variant_order: 1, visibility: 'invalid' },
        ],
      },
    ]);
    expect(artifacts[0].variants![0].visibility).toBeUndefined();
  });
});

// =============================================================================
// mapTriggers
// =============================================================================

describe('mapTriggers', () => {
  it('returns empty array for undefined', () => {
    expect(mapTriggers(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(mapTriggers([])).toEqual([]);
  });

  it('maps trigger fields correctly', () => {
    const triggers = mapTriggers([
      {
        id: 't1',
        name: 'Timer trigger',
        description: 'Fires when time is up',
        enabled: true,
        condition: { type: 'timer', seconds: 0 },
        actions: [{ type: 'show_message', text: 'Done!' }],
        sort_order: 1,
        execute_once: true,
        delay_seconds: 5,
      },
    ]);

    expect(triggers).toHaveLength(1);
    expect(triggers[0].title).toBe('Timer trigger');
    expect(triggers[0].description).toBe('Fires when time is up');
    expect(triggers[0].enabled).toBe(true);
    expect(triggers[0].executeOnce).toBe(true);
    expect(triggers[0].delaySeconds).toBe(5);
  });

  it('sorts by sort_order', () => {
    const triggers = mapTriggers([
      { id: 't2', name: 'Second', sort_order: 2 },
      { id: 't1', name: 'First', sort_order: 1 },
    ]);

    expect(triggers[0].title).toBe('First');
    expect(triggers[1].title).toBe('Second');
  });
});

// =============================================================================
// mapBoardConfigToWidgets
// =============================================================================

describe('mapBoardConfigToWidgets', () => {
  it('returns empty array when nothing enabled', () => {
    const widgets = mapBoardConfigToWidgets({
      show_timer: false,
      show_phase_name: false,
      show_step_text: false,
      show_roles: false,
    });
    expect(widgets).toEqual([]);
  });

  it('includes timer widget when enabled', () => {
    const widgets = mapBoardConfigToWidgets({ show_timer: true });
    expect(widgets).toHaveLength(1);
    expect(widgets[0].title).toBe('Timer');
  });

  it('includes all widgets when all enabled', () => {
    const widgets = mapBoardConfigToWidgets({
      show_timer: true,
      show_phase_name: true,
      show_step_text: true,
      show_roles: true,
      theme: 'Dark forest',
    });
    expect(widgets).toHaveLength(5);
  });

  it('uses theme value as detail', () => {
    const widgets = mapBoardConfigToWidgets({ theme: 'Blue ocean' });
    const themeWidget = widgets.find(w => w.title === 'Tema');
    expect(themeWidget).toBeDefined();
    expect(themeWidget!.detail).toBe('Blue ocean');
  });

  it('respects i18n labels override', () => {
    const widgets = mapBoardConfigToWidgets(
      { show_timer: true },
      { timerTitle: 'Countdown', timerDetail: 'Shows countdown per phase' }
    );
    expect(widgets[0].title).toBe('Countdown');
    expect(widgets[0].detail).toBe('Shows countdown per phase');
  });
});

// =============================================================================
// createMinimalSummary
// =============================================================================

describe('createMinimalSummary', () => {
  it('creates a valid GameSummary with id and title', () => {
    const summary = createMinimalSummary('test-id', 'Test Game');
    expect(summary.id).toBe('test-id');
    expect(summary.title).toBe('Test Game');
  });

  it('passes validateGameSummary', () => {
    const summary = createMinimalSummary('id', 'Title');
    expect(validateGameSummary(summary)).toBe(true);
  });
});

// =============================================================================
// validateGameSummary
// =============================================================================

describe('validateGameSummary', () => {
  it('returns true for valid summary', () => {
    expect(validateGameSummary({ id: 'x', title: 'Game' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateGameSummary(null)).toBe(false);
  });

  it('returns false for missing id', () => {
    expect(validateGameSummary({ title: 'Game' })).toBe(false);
  });

  it('returns false for missing title', () => {
    expect(validateGameSummary({ id: 'x' })).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(validateGameSummary('not an object')).toBe(false);
  });

  it('logs warning with source in development', () => {
    const origEnv = process.env.NODE_ENV;
    process.env = { ...process.env, NODE_ENV: 'development' };
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateGameSummary(null, 'TestSource');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    process.env = { ...process.env, NODE_ENV: origEnv };
  });
});

// =============================================================================
// mapSearchResultToSummary
// =============================================================================

describe('mapSearchResultToSummary', () => {
  it('maps search result to summary', () => {
    const summary = mapSearchResultToSummary({
      id: 'game-1',
      name: 'Search Game',
      slug: 'search-game',
      play_mode: 'basic',
      energy_level: 'low',
      time_estimate_min: 10,
      time_estimate_max: 20,
    });

    expect(summary.id).toBe('game-1');
    expect(summary.title).toBe('Search Game');
    expect(summary.playMode).toBe('basic');
  });
});

// =============================================================================
// mapPlannerBlockToSummary
// =============================================================================

describe('mapPlannerBlockToSummary', () => {
  it('maps planner block to summary', () => {
    const summary = mapPlannerBlockToSummary({
      id: 'game-1',
      title: 'Planner Game',
      energyLevel: 'high',
      durationMinutes: 15,
    });

    expect(summary.id).toBe('game-1');
    expect(summary.title).toBe('Planner Game');
    expect(summary.energyLevel).toBe('high');
  });
});
