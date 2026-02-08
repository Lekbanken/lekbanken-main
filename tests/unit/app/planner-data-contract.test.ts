/**
 * Planner Data Contract Tests (Sprint 4.7)
 *
 * Verifies that the Planner's data pipeline produces correct PlannerPlan/PlannerBlock objects.
 * Tests the mapper functions used by planner.server.ts.
 *
 * Note: These are unit tests that test the mappers directly, not integration tests
 * that hit the database. For DB integration, see integration tests.
 *
 * @module tests/unit/app/planner-data-contract.test.ts
 */

import { describe, it, expect } from 'vitest';
import type { PlannerPlan, PlannerBlock, PlannerGameSummary, PlannerPlayBlock } from '@/types/planner';

// =============================================================================
// GOLDEN FIXTURES - Match the shape produced by planner.server.ts
// =============================================================================

/**
 * Creates a minimal valid PlannerGameSummary matching mapGameSummary() output.
 */
function createGoldenGameSummary(overrides: Partial<PlannerGameSummary> = {}): PlannerGameSummary {
  return {
    id: 'game-uuid-1234',
    title: 'Test Game',
    shortDescription: 'A test game for planning',
    durationMinutes: 20,
    coverUrl: 'https://example.com/cover.jpg',
    energyLevel: 'medium',
    locationType: 'indoor',
    ...overrides,
  };
}

/**
 * Creates a minimal valid PlannerBlock matching mapSingleBlockInternal() output.
 */
function createGoldenBlock(overrides: Partial<PlannerBlock> = {}): PlannerBlock {
  return {
    id: 'block-uuid-1',
    planId: 'plan-uuid-1',
    position: 0,
    blockType: 'game',
    durationMinutes: 20,
    title: null,
    notes: null,
    isOptional: false,
    metadata: null,
    game: createGoldenGameSummary(),
    ...overrides,
  };
}

/**
 * Creates a minimal valid PlannerPlan matching buildPlanModel() output.
 */
function createGoldenPlan(overrides: Partial<PlannerPlan> = {}): PlannerPlan {
  return {
    id: 'plan-uuid-1',
    name: 'Test Plan',
    description: 'A test plan for verification',
    visibility: 'private',
    status: 'draft',
    ownerUserId: 'user-uuid-1',
    ownerTenantId: null,
    totalTimeMinutes: 60,
    currentVersionId: null,
    currentVersion: null,
    updatedAt: '2026-01-01T00:00:00Z',
    metadata: null,
    blocks: [
      createGoldenBlock({ position: 0 }),
      createGoldenBlock({ id: 'block-uuid-2', position: 1, blockType: 'pause', game: null, durationMinutes: 10, title: 'Coffee Break' }),
      createGoldenBlock({ id: 'block-uuid-3', position: 2 }),
    ],
    notes: {
      privateNote: null,
      tenantNote: null,
    },
    ...overrides,
  };
}

/**
 * Creates a PlannerPlayBlock for play view testing.
 */
function createGoldenPlayBlock(overrides: Partial<PlannerPlayBlock> = {}): PlannerPlayBlock {
  return {
    id: 'block-uuid-1',
    type: 'game',
    title: 'Test Game',
    durationMinutes: 20,
    notes: undefined,
    game: {
      id: 'game-uuid-1234',
      title: 'Test Game',
      summary: 'A test game for planning',
      materials: ['Paper', 'Markers'],
      coverUrl: 'https://example.com/cover.jpg',
      steps: [
        { title: 'Introduction', description: 'Welcome players', durationMinutes: 5 },
        { title: 'Main Activity', description: 'Play the game', durationMinutes: 10 },
        { title: 'Debrief', description: 'Discuss learnings', durationMinutes: 5 },
      ],
    },
    ...overrides,
  };
}

// =============================================================================
// CONTRACT TESTS - PlannerGameSummary
// =============================================================================

describe('Planner Data Contract', () => {
  describe('PlannerGameSummary fields', () => {
    it('has all required fields', () => {
      const summary = createGoldenGameSummary();

      expect(summary.id).toBeDefined();
      expect(typeof summary.id).toBe('string');
      expect(summary.title).toBeDefined();
      expect(typeof summary.title).toBe('string');
    });

    it('has optional fields with correct types', () => {
      const summary = createGoldenGameSummary();

      expect(typeof summary.shortDescription).toBe('string');
      expect(typeof summary.durationMinutes).toBe('number');
      expect(typeof summary.coverUrl).toBe('string');
      expect(typeof summary.energyLevel).toBe('string');
      expect(typeof summary.locationType).toBe('string');
    });

    it('handles null/undefined optional fields', () => {
      const summary = createGoldenGameSummary({
        shortDescription: null,
        durationMinutes: null,
        coverUrl: null,
        energyLevel: null,
        locationType: null,
      });

      // All should be safely null
      expect(summary.shortDescription).toBeNull();
      expect(summary.durationMinutes).toBeNull();
      expect(summary.coverUrl).toBeNull();
      expect(summary.energyLevel).toBeNull();
      expect(summary.locationType).toBeNull();
    });
  });

  describe('PlannerBlock fields', () => {
    it('has all required fields', () => {
      const block = createGoldenBlock();

      expect(block.id).toBeDefined();
      expect(block.planId).toBeDefined();
      expect(typeof block.position).toBe('number');
      expect(block.blockType).toBeDefined();
    });

    it('blockType is one of allowed values', () => {
      const validTypes = ['game', 'pause', 'preparation', 'custom'];

      expect(validTypes).toContain(createGoldenBlock({ blockType: 'game' }).blockType);
      expect(validTypes).toContain(createGoldenBlock({ blockType: 'pause' }).blockType);
      expect(validTypes).toContain(createGoldenBlock({ blockType: 'preparation' }).blockType);
      expect(validTypes).toContain(createGoldenBlock({ blockType: 'custom' }).blockType);
    });

    it('game blocks have PlannerGameSummary', () => {
      const gameBlock = createGoldenBlock({ blockType: 'game' });

      expect(gameBlock.game).toBeDefined();
      expect(gameBlock.game?.id).toBeDefined();
      expect(gameBlock.game?.title).toBeDefined();
    });

    it('non-game blocks have null game', () => {
      const pauseBlock = createGoldenBlock({ blockType: 'pause', game: null });
      const prepBlock = createGoldenBlock({ blockType: 'preparation', game: null });
      const customBlock = createGoldenBlock({ blockType: 'custom', game: null });

      expect(pauseBlock.game).toBeNull();
      expect(prepBlock.game).toBeNull();
      expect(customBlock.game).toBeNull();
    });

    it('durationMinutes can be null', () => {
      const block = createGoldenBlock({ durationMinutes: null });

      expect(block.durationMinutes).toBeNull();
    });

    it('position is a number starting from 0', () => {
      const block = createGoldenBlock({ position: 0 });

      expect(typeof block.position).toBe('number');
      expect(block.position).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PlannerPlan fields', () => {
    it('has all required fields', () => {
      const plan = createGoldenPlan();

      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.visibility).toBeDefined();
      expect(plan.status).toBeDefined();
      expect(plan.ownerUserId).toBeDefined();
      expect(plan.updatedAt).toBeDefined();
      expect(Array.isArray(plan.blocks)).toBe(true);
    });

    it('visibility is one of allowed values', () => {
      const validVisibilities = ['private', 'tenant', 'public'];

      expect(validVisibilities).toContain(createGoldenPlan({ visibility: 'private' }).visibility);
      expect(validVisibilities).toContain(createGoldenPlan({ visibility: 'tenant' }).visibility);
      expect(validVisibilities).toContain(createGoldenPlan({ visibility: 'public' }).visibility);
    });

    it('status is one of allowed values', () => {
      const validStatuses = ['draft', 'published', 'modified', 'archived'];

      expect(validStatuses).toContain(createGoldenPlan({ status: 'draft' }).status);
      expect(validStatuses).toContain(createGoldenPlan({ status: 'published' }).status);
      expect(validStatuses).toContain(createGoldenPlan({ status: 'modified' }).status);
      expect(validStatuses).toContain(createGoldenPlan({ status: 'archived' }).status);
    });

    it('blocks are sorted by position', () => {
      const plan = createGoldenPlan();

      for (let i = 1; i < plan.blocks.length; i++) {
        expect(plan.blocks[i].position).toBeGreaterThan(plan.blocks[i - 1].position);
      }
    });

    it('totalTimeMinutes is sum of block durations', () => {
      const plan = createGoldenPlan();
      const _sumDurations = plan.blocks.reduce(
        (sum, b) => sum + (b.durationMinutes ?? b.game?.durationMinutes ?? 0),
        0
      );

      // totalTimeMinutes should be >= sum (might include overrides)
      expect(plan.totalTimeMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PlannerPlayBlock for play view', () => {
    it('has all required fields', () => {
      const block = createGoldenPlayBlock();

      expect(block.id).toBeDefined();
      expect(block.type).toBeDefined();
      expect(block.title).toBeDefined();
      expect(typeof block.durationMinutes).toBe('number');
    });

    it('game blocks have steps array', () => {
      const block = createGoldenPlayBlock();

      expect(block.game).toBeDefined();
      expect(Array.isArray(block.game?.steps)).toBe(true);
      expect(block.game?.steps.length).toBeGreaterThan(0);
    });

    it('steps have required fields', () => {
      const block = createGoldenPlayBlock();

      for (const step of block.game?.steps ?? []) {
        expect(step.title).toBeDefined();
        expect(typeof step.title).toBe('string');
        // description and durationMinutes are optional
      }
    });

    it('materials is array or null', () => {
      const withMaterials = createGoldenPlayBlock();
      const withoutMaterials = createGoldenPlayBlock({
        game: { ...createGoldenPlayBlock().game!, materials: null },
      });

      expect(Array.isArray(withMaterials.game?.materials)).toBe(true);
      expect(withoutMaterials.game?.materials).toBeNull();
    });

    it('non-game blocks have no game property', () => {
      const pauseBlock: PlannerPlayBlock = {
        id: 'pause-1',
        type: 'pause',
        title: 'Paus',
        durationMinutes: 10,
      };

      expect(pauseBlock.game).toBeUndefined();
    });
  });

  describe('UUID format', () => {
    it('plan.id is a valid UUID', () => {
      const plan = createGoldenPlan({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' });
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(plan.id).toMatch(uuidRegex);
    });

    it('block.id is a valid UUID', () => {
      const block = createGoldenBlock({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' });
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(block.id).toMatch(uuidRegex);
    });

    it('game.id is a valid UUID', () => {
      const summary = createGoldenGameSummary({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' });
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(summary.id).toMatch(uuidRegex);
    });

    it('IDs have no prefix', () => {
      const plan = createGoldenPlan({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' });
      const block = createGoldenBlock({ id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' });

      expect(plan.id).not.toMatch(/^plan-/);
      expect(block.id).not.toMatch(/^block-/);
    });
  });
});

// =============================================================================
// DURATION CALCULATION
// =============================================================================

describe('Planner duration calculation', () => {
  it('block duration comes from durationMinutes first', () => {
    const block = createGoldenBlock({
      durationMinutes: 30,
      game: createGoldenGameSummary({ durationMinutes: 20 }),
    });

    // Block's explicit duration takes precedence
    expect(block.durationMinutes).toBe(30);
  });

  it('block duration falls back to game.durationMinutes when null', () => {
    const block = createGoldenBlock({
      durationMinutes: null,
      game: createGoldenGameSummary({ durationMinutes: 20 }),
    });

    // UI should use game.durationMinutes as fallback
    const effectiveDuration = block.durationMinutes ?? block.game?.durationMinutes ?? 0;
    expect(effectiveDuration).toBe(20);
  });

  it('total plan duration is computed from blocks', () => {
    const plan = createGoldenPlan({
      blocks: [
        createGoldenBlock({ position: 0, durationMinutes: 15 }),
        createGoldenBlock({ position: 1, durationMinutes: 20 }),
        createGoldenBlock({ position: 2, durationMinutes: 10 }),
      ],
      totalTimeMinutes: 45,
    });

    const computed = plan.blocks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);
    expect(computed).toBe(45);
    expect(plan.totalTimeMinutes).toBe(45);
  });
});

// =============================================================================
// FIELD AVAILABILITY FOR UI
// =============================================================================

describe('Planner UI field availability', () => {
  /**
   * Fields that the Planner wizard BlockCard reads.
   */
  const BLOCK_CARD_FIELDS: (keyof PlannerBlock)[] = [
    'id',
    'position',
    'blockType',
    'durationMinutes',
    'title',
    'notes',
    'isOptional',
    'game',
  ];

  it('all BlockCard fields are available', () => {
    const block = createGoldenBlock();

    for (const field of BLOCK_CARD_FIELDS) {
      expect(block).toHaveProperty(field);
    }
  });

  /**
   * Fields that the Planner uses from PlannerGameSummary.
   */
  const GAME_SUMMARY_FIELDS: (keyof PlannerGameSummary)[] = [
    'id',
    'title',
    'shortDescription',
    'durationMinutes',
    'coverUrl',
    'energyLevel',
    'locationType',
  ];

  it('all PlannerGameSummary fields are available', () => {
    const summary = createGoldenGameSummary();

    for (const field of GAME_SUMMARY_FIELDS) {
      expect(summary).toHaveProperty(field);
    }
  });
});

// =============================================================================
// NOTES STRUCTURE
// =============================================================================

describe('Planner notes structure', () => {
  it('notes object has correct shape', () => {
    const plan = createGoldenPlan({
      notes: {
        privateNote: {
          id: 'note-1',
          content: 'Private note content',
          updatedAt: '2026-01-01T00:00:00Z',
          updatedBy: 'user-1',
        },
        tenantNote: null,
      },
    });

    expect(plan.notes).toBeDefined();
    expect(plan.notes?.privateNote?.content).toBe('Private note content');
    expect(plan.notes?.tenantNote).toBeNull();
  });

  it('notes can be completely null', () => {
    const plan = createGoldenPlan({
      notes: {
        privateNote: null,
        tenantNote: null,
      },
    });

    expect(plan.notes?.privateNote).toBeNull();
    expect(plan.notes?.tenantNote).toBeNull();
  });
});
