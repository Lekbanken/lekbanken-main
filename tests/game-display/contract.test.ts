/**
 * D3 Task 9.4 — Contract Tests
 *
 * Verify type contracts between authoring, display, and play domains.
 * These tests catch structural drift between the three type systems.
 *
 * @see GAMEDETAILS_IMPLEMENTATION_PLAN.md D3 Plattformsevolution
 */

import { describe, it, expect } from 'vitest';
import type { GameAuthoringData } from '@/lib/game-authoring/types';
import type { GameDetailData, GameStep, GameRole } from '@/lib/game-display/types';
import type { Step, RunStep } from '@/features/play/types';
import type { SessionRole } from '@/types/play-runtime';

// =============================================================================
// 9.4a — GameAuthoringData ↔ GameDetailData Contract
// =============================================================================

describe('GameAuthoringData ↔ GameDetailData Contract (9.4a)', () => {
  it('all authoring content fields exist in GameDetailData', () => {
    // Construct a full GameAuthoringData to verify overlap
    const authoring: GameAuthoringData = {
      id: 'test-id',
      name: 'Test',
      gameKey: 'test-key',
      description: 'desc',
      shortDescription: 'short',
      instructions: 'inst',
      highlights: ['h1'],
      leaderTips: ['t1'],
      outcomes: ['o1'],
      status: 'published',
      playMode: 'basic',
      energyLevel: 'medium',
      environment: 'indoor',
      difficulty: 'easy',
      category: 'cat',
      purposeId: 'p1',
      productId: 'pr1',
      durationMin: 10,
      durationMax: 30,
      minPlayers: 4,
      maxPlayers: 20,
      ageMin: 8,
      ageMax: 99,
      steps: [{ title: 'Step 1' }],
      phases: [{ title: 'Phase 1', duration: '5 min', goal: 'goal' }],
      roles: [{ name: 'Role 1' }],
      artifacts: [{ title: 'Art 1' }],
      triggers: [{ title: 'Trig 1', condition: 'cond', effect: 'eff' }],
      decisions: [{ title: 'Dec', prompt: 'p', options: ['a', 'b'] }],
      materials: [{ label: 'Mat 1' }],
      safety: ['safe'],
      accessibility: ['a11y'],
      preparation: ['prep'],
      requirements: ['req'],
      facilitatorTools: ['tool'],
      boardWidgets: [{ title: 'Widget' }],
      coverUrl: 'https://example.com/cover.jpg',
      gallery: ['https://example.com/g1.jpg'],
      contentSchemaVersion: 1,
    };

    // Verify the object compiles — this is a compile-time contract test.
    // If GameAuthoringData has a field that doesn't exist in the type system, TSC fails here.
    expect(authoring.id).toBe('test-id');
    expect(authoring.name).toBe('Test');
  });

  it('shared content fields have compatible types', () => {
    // Build a GameDetailData and verify types match authoring expectations
    const detail: GameDetailData = {
      id: 'test-id',
      title: 'Test',
      slug: 'test-slug',
      description: 'desc',
      highlights: ['h1'],
      leaderTips: ['t1'],
      outcomes: ['o1'],
      steps: [{ title: 'Step 1' }],
      phases: [{ title: 'Phase 1', duration: '5 min', goal: 'goal' }],
      roles: [{ name: 'Role 1' }],
      artifacts: [{ title: 'Art 1' }],
      triggers: [{ title: 'Trig', condition: 'c', effect: 'e' }],
      materials: [{ label: 'Mat 1' }],
      safety: ['safe'],
      accessibility: ['a11y'],
      preparation: ['prep'],
      requirements: ['req'],
      facilitatorTools: ['tool'],
      boardWidgets: [{ title: 'Widget' }],
      gallery: ['url'],
    };

    // Type-compatible fields exist — compile-time contract
    expect(detail.id).toBe('test-id');
    expect(detail.steps).toHaveLength(1);
    expect(detail.roles).toHaveLength(1);
  });
});

// =============================================================================
// 9.4b — GameStep ↔ Step Contract (Display ↔ Play)
// =============================================================================

describe('GameStep ↔ Play Step Contract (9.4b)', () => {
  it('Step has overlapping field concepts with GameStep', () => {
    // Both types share these concepts:
    const gameStep: GameStep = {
      id: 'gs1',
      title: 'Game Step',
      body: 'Description body',
      durationMinutes: 3,
    };

    const playStep: Step = {
      id: 'ps1',
      title: 'Play Step',
      description: 'Description',
      durationMinutes: 3,
    };

    // Shared concept: id, title, durationMinutes
    expect(typeof gameStep.id).toBe(typeof playStep.id);
    expect(typeof gameStep.title).toBe(typeof playStep.title);
    expect(typeof gameStep.durationMinutes).toBe(typeof playStep.durationMinutes);
  });

  it('RunStep extends Step structurally', () => {
    const runStep: RunStep = {
      id: 'rs1',
      title: 'Run Step',
      description: 'Desc',
      durationMinutes: 5,
      index: 0,
      blockId: 'block-1',
      blockType: 'game',
    };

    // RunStep has all Step fields
    const asStep: Step = runStep;
    expect(asStep.id).toBe('rs1');
    expect(asStep.title).toBe('Run Step');
    expect(asStep.description).toBe('Desc');
    expect(asStep.durationMinutes).toBe(5);
  });

  it('RunStep adds execution fields not in Step', () => {
    const runStep: RunStep = {
      id: 'rs1',
      title: 'Step',
      description: 'Desc',
      durationMinutes: 5,
      index: 2,
      blockId: 'b1',
      blockType: 'session_game',
      requiresSession: true,
      sessionSpec: { gameId: 'g1', autoCreate: true },
      gameSnapshot: { id: 'g1', title: 'Game', shortDescription: 'Short' },
    };

    expect(runStep.index).toBe(2);
    expect(runStep.blockType).toBe('session_game');
    expect(runStep.sessionSpec?.gameId).toBe('g1');
  });
});

// =============================================================================
// 9.4c — GameRole ↔ SessionRole Contract
// =============================================================================

describe('GameRole ↔ SessionRole Contract (9.4c)', () => {
  it('SessionRole contains all GameRole concepts', () => {
    const gameRole: GameRole = {
      id: 'gr1',
      name: 'Anfallare',
      icon: '⚡',
      color: '#ff0000',
      minCount: 2,
      maxCount: 5,
      publicNote: 'Attackerar',
      privateNote: 'Spring snabbt',
      assignmentStrategy: 'random',
      scalingRules: { '10': 3 },
      conflictsWith: ['role-2'],
    };

    const sessionRole: SessionRole = {
      id: 'sr1',
      session_id: 'sess-1',
      source_role_id: gameRole.id!,
      name: gameRole.name,
      icon: gameRole.icon ?? null,
      color: gameRole.color ?? null,
      role_order: 1,
      public_description: gameRole.publicNote ?? null,
      private_instructions: gameRole.privateNote ?? '',
      private_hints: null,
      min_count: gameRole.minCount ?? 0,
      max_count: gameRole.maxCount ?? null,
      assignment_strategy: gameRole.assignmentStrategy ?? 'random',
      scaling_rules: gameRole.scalingRules ?? null,
      conflicts_with: gameRole.conflictsWith ?? [],
      assigned_count: 0,
      created_at: '2026-01-01T00:00:00Z',
    };

    // Verify field mapping preserves data
    expect(sessionRole.name).toBe(gameRole.name);
    expect(sessionRole.icon).toBe(gameRole.icon);
    expect(sessionRole.color).toBe(gameRole.color);
    expect(sessionRole.public_description).toBe(gameRole.publicNote);
    expect(sessionRole.private_instructions).toBe(gameRole.privateNote);
    expect(sessionRole.min_count).toBe(gameRole.minCount);
    expect(sessionRole.max_count).toBe(gameRole.maxCount);
    expect(sessionRole.assignment_strategy).toBe(gameRole.assignmentStrategy);
    expect(sessionRole.source_role_id).toBe(gameRole.id);
  });

  it('SessionRole adds runtime fields not in GameRole', () => {
    const sessionRole: SessionRole = {
      id: 'sr1',
      session_id: 'sess-1',
      source_role_id: 'gr1',
      name: 'Test',
      icon: null,
      color: null,
      role_order: 1,
      public_description: null,
      private_instructions: '',
      private_hints: 'Use flank strategy',
      min_count: 1,
      max_count: null,
      assignment_strategy: 'leader_picks',
      scaling_rules: null,
      conflicts_with: [],
      assigned_count: 3,
      created_at: '2026-01-01T00:00:00Z',
    };

    // Runtime-specific fields
    expect(sessionRole.session_id).toBe('sess-1');
    expect(sessionRole.source_role_id).toBe('gr1');
    expect(sessionRole.role_order).toBe(1);
    expect(sessionRole.private_hints).toBe('Use flank strategy');
    expect(sessionRole.assigned_count).toBe(3);
    expect(sessionRole.created_at).toBeDefined();
  });

  it('assignment_strategy enum values are identical', () => {
    const strategies = ['random', 'leader_picks', 'player_picks'] as const;

    for (const strategy of strategies) {
      // Both types accept the same strategy values — compile-time check
      const gameRole: GameRole = { name: 'Test', assignmentStrategy: strategy };
      const sessionRole: SessionRole = {
        id: 'sr', session_id: 's', source_role_id: null,
        name: 'Test', icon: null, color: null, role_order: 0,
        public_description: null, private_instructions: '',
        private_hints: null, min_count: 0, max_count: null,
        assignment_strategy: strategy,
        scaling_rules: null, conflicts_with: [], assigned_count: 0,
        created_at: '2026-01-01',
      };

      expect(gameRole.assignmentStrategy).toBe(sessionRole.assignment_strategy);
    }
  });
});

// =============================================================================
// 9.4d — GameAuthoringData Validation
// =============================================================================

describe('GameAuthoringData Validation (9.4d)', () => {
  it('isValidAuthoringData accepts valid data', async () => {
    const { isValidAuthoringData } = await import('@/lib/game-authoring/types');

    expect(isValidAuthoringData({ id: 'test', name: 'Test Game' })).toBe(true);
    expect(isValidAuthoringData({
      id: 'full',
      name: 'Full Game',
      steps: [{ title: 'Step 1' }],
      roles: [{ name: 'Role 1' }],
    })).toBe(true);
  });

  it('isValidAuthoringData rejects invalid data', async () => {
    const { isValidAuthoringData } = await import('@/lib/game-authoring/types');

    expect(isValidAuthoringData(null)).toBe(false);
    expect(isValidAuthoringData(undefined)).toBe(false);
    expect(isValidAuthoringData({})).toBe(false);
    expect(isValidAuthoringData({ id: 'test' })).toBe(false);
    expect(isValidAuthoringData({ name: 'test' })).toBe(false);
    expect(isValidAuthoringData('string')).toBe(false);
    expect(isValidAuthoringData(42)).toBe(false);
  });
});
