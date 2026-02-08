/**
 * Roundtrip Parity Tests (Sprint 4.6)
 *
 * Proves roundtrip integrity:
 * Draft -> RPC upsert -> DB -> fetch -> hydrate -> resolveDraft gates
 *
 * These tests verify that:
 * 1. Data survives the full save/load cycle without corruption
 * 2. UUIDs remain in raw format (no step- or phase- prefixes)
 * 3. Order fields are preserved correctly
 * 4. References (phase_id, step_id, role_id) remain valid
 * 5. null vs undefined policy is consistent
 *
 * Run with local Supabase:
 * TEST_SUPABASE_URL=... TEST_SUPABASE_SERVICE_ROLE_KEY=... npx vitest tests/integration/builder/roundtrip.test.ts
 *
 * @module tests/integration/builder/roundtrip.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../../types/supabase';
import { resolveDraft } from '@/lib/builder/resolver';
import type { GameDraft } from '@/lib/builder/resolver';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? '';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? '';

const dbTestsEnabled =
  TEST_SUPABASE_URL.length > 0 && TEST_SUPABASE_SERVICE_KEY.length > 0;

let supabase: SupabaseClient<Database> | null = null;
let testTenantId: string | null = null;
let testPurposeId: string | null = null;
const createdGameIds: string[] = [];

// =============================================================================
// RPC TYPES
// =============================================================================

interface RpcResult {
  ok: boolean;
  game_id?: string;
  code?: string;
  error?: string;
  counts?: Record<string, number>;
}

async function callUpsertRpc(
  client: SupabaseClient<Database>,
  payload: Record<string, unknown>
): Promise<{ data: RpcResult | null; error: Error | null }> {
  const { data, error } = await client.rpc(
    'upsert_game_content_v1' as never,
    { p_payload: payload } as never
  );
  return { data: data as RpcResult | null, error };
}

// =============================================================================
// GOLDEN DRAFT FIXTURES
// =============================================================================

function createSimpleDraft(): { gameId: string; draft: GameDraft; payload: Record<string, unknown> } {
  const gameId = randomUUID();
  const stepId1 = randomUUID();
  const stepId2 = randomUUID();

  const draft: GameDraft = {
    core: {
      name: 'Simple Test Game',
      description: 'A basic game for roundtrip testing',
      play_mode: 'basic',
      energy_level: 'medium',
      location_type: 'indoor',
      min_players: 2,
      max_players: 10,
      age_min: 6,
      age_max: 12,
    },
    steps: [
      {
        id: stepId1,
        title: 'Welcome',
        body: 'Welcome to the game',
        step_order: 0,
        display_mode: 'instant',
        phase_id: null,
      },
      {
        id: stepId2,
        title: 'Play',
        body: 'Lets play!',
        step_order: 1,
        display_mode: 'instant',
        phase_id: null,
      },
    ],
    phases: [],
    roles: [],
    artifacts: [],
    triggers: [],
    cover: { mediaId: null },
  };

  const payload = {
    game_id: gameId,
    is_update: false,
    import_run_id: randomUUID(),
    steps: [
      {
        id: stepId1,
        step_order: 0,
        title: 'Welcome',
        body: 'Welcome to the game',
        duration_seconds: null,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: null,
        conditional: null,
        media_ref: null,
        display_mode: null,
      },
      {
        id: stepId2,
        step_order: 1,
        title: 'Play',
        body: 'Lets play!',
        duration_seconds: null,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: null,
        conditional: null,
        media_ref: null,
        display_mode: null,
      },
    ],
    phases: [],
    roles: [],
    materials: null,
    board_config: null,
    secondary_purpose_ids: [],
    artifacts: [],
    artifact_variants: [],
    triggers: [],
  };

  return { gameId, draft, payload };
}

function createFacilitatedDraft(): { gameId: string; draft: GameDraft; payload: Record<string, unknown> } {
  const gameId = randomUUID();
  const phaseId1 = randomUUID();
  const phaseId2 = randomUUID();
  const phaseId3 = randomUUID();
  const stepId1 = randomUUID();
  const stepId2 = randomUUID();
  const stepId3 = randomUUID();

  const draft: GameDraft = {
    core: {
      name: 'Facilitated Test Game',
      description: 'A game with phases for roundtrip testing',
      play_mode: 'facilitated',
      energy_level: 'medium',
      location_type: 'indoor',
      min_players: 4,
      max_players: 20,
      age_min: 8,
      age_max: 14,
    },
    steps: [
      {
        id: stepId1,
        title: 'Introduction',
        body: 'Welcome everyone',
        step_order: 0,
        display_mode: 'instant',
        phase_id: phaseId1,
      },
      {
        id: stepId2,
        title: 'Main Activity',
        body: 'Complete the activity',
        step_order: 1,
        display_mode: 'instant',
        phase_id: phaseId2,
      },
      {
        id: stepId3,
        title: 'Wrap Up',
        body: 'Share learnings',
        step_order: 2,
        display_mode: 'instant',
        phase_id: phaseId3,
      },
    ],
    phases: [
      {
        id: phaseId1,
        name: 'Intro Phase',
        phase_order: 0,
        phase_type: 'intro',
        timer_style: 'countdown',
      },
      {
        id: phaseId2,
        name: 'Main Phase',
        phase_order: 1,
        phase_type: 'round',
        timer_style: 'countdown',
      },
      {
        id: phaseId3,
        name: 'Outro Phase',
        phase_order: 2,
        phase_type: 'finale',
        timer_style: 'countdown',
      },
    ],
    roles: [],
    artifacts: [],
    triggers: [],
    cover: { mediaId: null },
  };

  const payload = {
    game_id: gameId,
    is_update: false,
    import_run_id: randomUUID(),
    steps: [
      {
        id: stepId1,
        step_order: 0,
        title: 'Introduction',
        body: 'Welcome everyone',
        duration_seconds: null,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: phaseId1,
        conditional: null,
        media_ref: null,
        display_mode: null,
      },
      {
        id: stepId2,
        step_order: 1,
        title: 'Main Activity',
        body: 'Complete the activity',
        duration_seconds: null,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: phaseId2,
        conditional: null,
        media_ref: null,
        display_mode: null,
      },
      {
        id: stepId3,
        step_order: 2,
        title: 'Wrap Up',
        body: 'Share learnings',
        duration_seconds: null,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: phaseId3,
        conditional: null,
        media_ref: null,
        display_mode: null,
      },
    ],
    phases: [
      {
        id: phaseId1,
        phase_order: 0,
        name: 'Intro Phase',
        phase_type: 'intro',
        duration_seconds: null,
        timer_visible: true,
        timer_style: 'countdown',
        description: null,
        board_message: null,
        auto_advance: false,
        locale: null,
      },
      {
        id: phaseId2,
        phase_order: 1,
        name: 'Main Phase',
        phase_type: 'round',
        duration_seconds: null,
        timer_visible: true,
        timer_style: 'countdown',
        description: null,
        board_message: null,
        auto_advance: false,
        locale: null,
      },
      {
        id: phaseId3,
        phase_order: 2,
        name: 'Outro Phase',
        phase_type: 'finale',
        duration_seconds: null,
        timer_visible: true,
        timer_style: 'countdown',
        description: null,
        board_message: null,
        auto_advance: false,
        locale: null,
      },
    ],
    roles: [],
    materials: null,
    board_config: null,
    secondary_purpose_ids: [],
    artifacts: [],
    artifact_variants: [],
    triggers: [],
  };

  return { gameId, draft, payload };
}

function createRolesArtifactsDraft(): { gameId: string; draft: GameDraft; payload: Record<string, unknown> } {
  const gameId = randomUUID();
  const phaseId1 = randomUUID();
  const phaseId2 = randomUUID();
  const stepId1 = randomUUID();
  const stepId2 = randomUUID();
  const roleId1 = randomUUID();
  const roleId2 = randomUUID();
  const artifactId1 = randomUUID();
  const artifactId2 = randomUUID();
  const variantId1 = randomUUID();
  const variantId2 = randomUUID();

  const draft: GameDraft = {
    core: {
      name: 'Complex Participants Game',
      description: 'A game with roles and artifacts',
      play_mode: 'participants',
      energy_level: 'high',
      location_type: 'outdoor',
      min_players: 6,
      max_players: 30,
      age_min: 10,
      age_max: 16,
    },
    steps: [
      {
        id: stepId1,
        title: 'Setup',
        body: 'Assign roles',
        step_order: 0,
        display_mode: 'instant',
        phase_id: phaseId1,
      },
      {
        id: stepId2,
        title: 'Challenge',
        body: 'Complete the mystery',
        step_order: 1,
        display_mode: 'instant',
        phase_id: phaseId2,
      },
    ],
    phases: [
      {
        id: phaseId1,
        name: 'Setup Phase',
        phase_order: 0,
        phase_type: 'intro',
        timer_style: 'countdown',
      },
      {
        id: phaseId2,
        name: 'Challenge Phase',
        phase_order: 1,
        phase_type: 'round',
        timer_style: 'countdown',
      },
    ],
    roles: [
      {
        id: roleId1,
        name: 'Detective',
        role_order: 0,
        assignment_strategy: 'random',
      },
      {
        id: roleId2,
        name: 'Suspect',
        role_order: 1,
        assignment_strategy: 'random',
      },
    ],
    artifacts: [
      {
        id: artifactId1,
        title: 'Secret Keypad',
        artifact_type: 'keypad',
        artifact_order: 0,
        metadata: { correctCode: '1234', maxAttempts: 3 },
        variants: [
          {
            id: variantId1,
            visibility: 'public',
            visible_to_role_id: null,
          },
        ],
      },
      {
        id: artifactId2,
        title: 'Clue Card',
        artifact_type: 'card',
        artifact_order: 1,
        metadata: { step_id: stepId1 },
        variants: [
          {
            id: variantId2,
            visibility: 'role_private',
            visible_to_role_id: roleId1,
          },
        ],
      },
    ],
    triggers: [],
    cover: { mediaId: null },
  };

  const payload = {
    game_id: gameId,
    is_update: false,
    import_run_id: randomUUID(),
    steps: [
      {
        id: stepId1,
        step_order: 0,
        title: 'Setup',
        body: 'Assign roles',
        duration_seconds: null,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: phaseId1,
        conditional: null,
        media_ref: null,
        display_mode: null,
      },
      {
        id: stepId2,
        step_order: 1,
        title: 'Challenge',
        body: 'Complete the mystery',
        duration_seconds: null,
        leader_script: null,
        participant_prompt: null,
        board_text: null,
        optional: false,
        locale: null,
        phase_id: phaseId2,
        conditional: null,
        media_ref: null,
        display_mode: null,
      },
    ],
    phases: [
      {
        id: phaseId1,
        phase_order: 0,
        name: 'Setup Phase',
        phase_type: 'intro',
        duration_seconds: null,
        timer_visible: true,
        timer_style: 'countdown',
        description: null,
        board_message: null,
        auto_advance: false,
        locale: null,
      },
      {
        id: phaseId2,
        phase_order: 1,
        name: 'Challenge Phase',
        phase_type: 'round',
        duration_seconds: null,
        timer_visible: true,
        timer_style: 'countdown',
        description: null,
        board_message: null,
        auto_advance: false,
        locale: null,
      },
    ],
    roles: [
      {
        id: roleId1,
        role_order: 0,
        name: 'Detective',
        icon: null,
        color: null,
        public_description: null,
        private_instructions: 'Find the clues',
        private_hints: null,
        min_count: 1,
        max_count: 2,
        assignment_strategy: 'random',
        scaling_rules: null,
        conflicts_with: null,
        locale: null,
      },
      {
        id: roleId2,
        role_order: 1,
        name: 'Suspect',
        icon: null,
        color: null,
        public_description: null,
        private_instructions: 'Hide the truth',
        private_hints: null,
        min_count: 2,
        max_count: 4,
        assignment_strategy: 'random',
        scaling_rules: null,
        conflicts_with: null,
        locale: null,
      },
    ],
    materials: null,
    board_config: null,
    secondary_purpose_ids: [],
    artifacts: [
      {
        id: artifactId1,
        artifact_order: 0,
        artifact_type: 'keypad',
        title: 'Secret Keypad',
        description: null,
        metadata: { correctCode: '1234', maxAttempts: 3 },
        tags: [],
        locale: null,
      },
      {
        id: artifactId2,
        artifact_order: 1,
        artifact_type: 'card',
        title: 'Clue Card',
        description: null,
        metadata: { step_id: stepId1 },
        tags: [],
        locale: null,
      },
    ],
    artifact_variants: [
      {
        id: variantId1,
        artifact_id: artifactId1,
        variant_order: 0,
        visibility: 'public',
        visible_to_role_id: null,
        title: null,
        body: null,
        media_ref: null,
        metadata: null,
      },
      {
        id: variantId2,
        artifact_id: artifactId2,
        variant_order: 0,
        visibility: 'role_private',
        visible_to_role_id: roleId1,
        title: 'Detective Clue',
        body: 'The secret is in the garden',
        media_ref: null,
        metadata: null,
      },
    ],
    triggers: [],
  };

  return { gameId, draft, payload };
}

// =============================================================================
// DB HYDRATION (mirrors GameBuilderPage fetch + hydration)
// =============================================================================

async function fetchAndHydrate(gameId: string): Promise<GameDraft | null> {
  if (!supabase) throw new Error('supabase not initialized');

  // Fetch game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError || !game) return null;

  // Fetch related data
  const [
    { data: steps },
    { data: phases },
    { data: roles },
    { data: artifacts },
  ] = await Promise.all([
    supabase.from('game_steps').select('*').eq('game_id', gameId).order('step_order'),
    supabase.from('game_phases').select('*').eq('game_id', gameId).order('phase_order'),
    supabase.from('game_roles').select('*').eq('game_id', gameId).order('role_order'),
    supabase.from('game_artifacts').select('*').eq('game_id', gameId).order('artifact_order'),
  ]);

  // Fetch artifact variants
  const artifactIds = (artifacts ?? []).map((a: { id: string }) => a.id);
  let artifactVariants: unknown[] = [];
  if (artifactIds.length > 0) {
    const { data } = await supabase
      .from('game_artifact_variants')
      .select('*')
      .in('artifact_id', artifactIds)
      .order('variant_order');
    artifactVariants = data ?? [];
  }

  // Build variants map
  const variantsByArtifact: Record<string, unknown[]> = {};
  for (const v of artifactVariants) {
    const rec = v as Record<string, unknown>;
    const artifactId = rec.artifact_id as string;
    if (!variantsByArtifact[artifactId]) variantsByArtifact[artifactId] = [];
    variantsByArtifact[artifactId].push(v);
  }

  // Hydrate to GameDraft (mirrors GameBuilderPage)
  const hydratedDraft: GameDraft = {
    core: {
      name: game.name ?? '',
      description: game.description ?? undefined,
      play_mode: game.play_mode,
      energy_level: game.energy_level,
      location_type: game.location_type,
      min_players: game.min_players,
      max_players: game.max_players,
      age_min: game.age_min,
      age_max: game.age_max,
    },
    steps: (steps ?? []).map((s: Record<string, unknown>, idx: number) => ({
      id: s.id as string,
      title: (s.title as string) || '',
      body: (s.body as string) || '',
      step_order: typeof s.step_order === 'number' ? s.step_order : idx,
      display_mode: 'instant' as const,
      phase_id: (s.phase_id as string | null) ?? null,
    })),
    phases: (phases ?? []).map((p: Record<string, unknown>, idx: number) => ({
      id: p.id as string,
      name: (p.name as string) || '',
      phase_order: typeof p.phase_order === 'number' ? p.phase_order : idx,
      phase_type: (p.phase_type as string) || 'round',
      timer_style: (p.timer_style as string) || 'countdown',
    })),
    roles: (roles ?? []).map((r: Record<string, unknown>, idx: number) => ({
      id: r.id as string,
      name: (r.name as string) || '',
      role_order: typeof r.role_order === 'number' ? r.role_order : idx,
      assignment_strategy: (r.assignment_strategy as string) || 'random',
    })),
    artifacts: (artifacts ?? []).map((a: Record<string, unknown>, idx: number) => {
      const variants = (variantsByArtifact[a.id as string] ?? []).map((v: unknown) => {
        const vRec = v as Record<string, unknown>;
        return {
          id: vRec.id as string,
          visibility: (vRec.visibility as string) || 'public',
          visible_to_role_id: (vRec.visible_to_role_id as string | null) ?? null,
        };
      });
      return {
        id: a.id as string,
        title: (a.title as string) || '',
        artifact_type: (a.artifact_type as string) || 'card',
        artifact_order: typeof a.artifact_order === 'number' ? a.artifact_order : idx,
        metadata: (a.metadata as Record<string, unknown>) ?? {},
        variants,
      };
    }),
    triggers: [],
    cover: { mediaId: null },
  };

  return hydratedDraft;
}

// =============================================================================
// TEST SETUP / TEARDOWN
// =============================================================================

beforeAll(async () => {
  if (!dbTestsEnabled) return;

  supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY);

  // Find or create test tenant
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .limit(1);

  if (tenants && tenants.length > 0) {
    testTenantId = tenants[0].id;
  } else {
    const { data: newTenant } = await supabase
      .from('tenants')
      .insert({ name: 'Roundtrip Test Tenant', slug: `roundtrip-test-${Date.now()}`, type: 'organization' })
      .select('id')
      .single();
    testTenantId = newTenant?.id ?? null;
  }

  // Find or create test purpose
  const { data: purposes } = await supabase
    .from('purposes')
    .select('id')
    .limit(1);

  if (purposes && purposes.length > 0) {
    testPurposeId = purposes[0].id;
  }
});

afterAll(async () => {
  if (!supabase) return;

  // Cleanup created games
  for (const gameId of createdGameIds) {
    await supabase.from('games').delete().eq('id', gameId);
  }
});

// =============================================================================
// TESTS
// =============================================================================

describe.skipIf(!dbTestsEnabled)('Roundtrip Parity Tests (Sprint 4.6)', () => {
  // =========================================================================
  // SUITE 1: Simple Game Roundtrip
  // =========================================================================
  describe('Simple game roundtrip', () => {
    let gameId: string;
    let originalDraft: GameDraft;

    beforeEach(async () => {
      if (!supabase || !testTenantId) return;

      const fixture = createSimpleDraft();
      gameId = fixture.gameId;
      originalDraft = fixture.draft;
      createdGameIds.push(gameId);

      // Create game record first
      await supabase.from('games').insert({
        id: gameId,
        name: originalDraft.core?.name ?? '',
        short_description: 'Test game',
        play_mode: originalDraft.core?.play_mode ?? 'basic',
        status: 'draft',
        owner_tenant_id: testTenantId,
        main_purpose_id: testPurposeId,
      });

      // Upsert content via RPC
      const { data, error } = await callUpsertRpc(supabase, fixture.payload);
      expect(error).toBeNull();
      expect(data?.ok).toBe(true);
    });

    it('draft passes resolveDraft after roundtrip', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const result = resolveDraft(hydrated!);
      const draftErrors = result.errorsByGate.draft;
      expect(draftErrors).toHaveLength(0);
      expect(result.isGatePassed('draft')).toBe(true);
    });

    it('step IDs are raw UUIDs (no step- prefix)', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      for (const step of hydrated!.steps ?? []) {
        expect(step.id).not.toMatch(/^step-/);
        expect(step.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it('step_order is preserved', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const steps = hydrated!.steps ?? [];
      expect(steps.length).toBe(2);
      expect(steps[0].step_order).toBe(0);
      expect(steps[1].step_order).toBe(1);
    });

    it('step titles are preserved', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      expect(hydrated!.steps![0].title).toBe('Welcome');
      expect(hydrated!.steps![1].title).toBe('Play');
    });
  });

  // =========================================================================
  // SUITE 2: Facilitated Game Roundtrip
  // =========================================================================
  describe('Facilitated game roundtrip', () => {
    let gameId: string;
    let originalDraft: GameDraft;

    beforeEach(async () => {
      if (!supabase || !testTenantId) return;

      const fixture = createFacilitatedDraft();
      gameId = fixture.gameId;
      originalDraft = fixture.draft;
      createdGameIds.push(gameId);

      // Create game record first
      await supabase.from('games').insert({
        id: gameId,
        name: originalDraft.core?.name ?? '',
        short_description: 'Facilitated test game',
        play_mode: originalDraft.core?.play_mode ?? 'facilitated',
        status: 'draft',
        owner_tenant_id: testTenantId,
        main_purpose_id: testPurposeId,
      });

      // Upsert content via RPC
      const { data, error } = await callUpsertRpc(supabase, fixture.payload);
      expect(error).toBeNull();
      expect(data?.ok).toBe(true);
    });

    it('draft passes resolveDraft after roundtrip', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const result = resolveDraft(hydrated!);
      const draftErrors = result.errorsByGate.draft;
      expect(draftErrors).toHaveLength(0);
      expect(result.isGatePassed('draft')).toBe(true);
    });

    it('phase IDs are raw UUIDs (no phase- prefix)', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      for (const phase of hydrated!.phases ?? []) {
        expect(phase.id).not.toMatch(/^phase-/);
        expect(phase.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it('step.phase_id references are valid', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const phaseIds = new Set((hydrated!.phases ?? []).map((p) => p.id));
      for (const step of hydrated!.steps ?? []) {
        if (step.phase_id) {
          expect(phaseIds.has(step.phase_id)).toBe(true);
        }
      }
    });

    it('phase_order is preserved', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const phases = hydrated!.phases ?? [];
      expect(phases.length).toBe(3);
      expect(phases[0].phase_order).toBe(0);
      expect(phases[1].phase_order).toBe(1);
      expect(phases[2].phase_order).toBe(2);
    });

    it('phase names are preserved', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      expect(hydrated!.phases![0].name).toBe('Intro Phase');
      expect(hydrated!.phases![1].name).toBe('Main Phase');
      expect(hydrated!.phases![2].name).toBe('Outro Phase');
    });
  });

  // =========================================================================
  // SUITE 3: Roles + Artifacts Roundtrip
  // =========================================================================
  describe('Roles + artifacts roundtrip', () => {
    let gameId: string;
    let originalDraft: GameDraft;

    beforeEach(async () => {
      if (!supabase || !testTenantId) return;

      const fixture = createRolesArtifactsDraft();
      gameId = fixture.gameId;
      originalDraft = fixture.draft;
      createdGameIds.push(gameId);

      // Create game record first
      await supabase.from('games').insert({
        id: gameId,
        name: originalDraft.core?.name ?? '',
        short_description: 'Complex test game',
        play_mode: originalDraft.core?.play_mode ?? 'participants',
        status: 'draft',
        owner_tenant_id: testTenantId,
        main_purpose_id: testPurposeId,
      });

      // Upsert content via RPC
      const { data, error } = await callUpsertRpc(supabase, fixture.payload);
      expect(error).toBeNull();
      expect(data?.ok).toBe(true);
    });

    it('draft passes resolveDraft after roundtrip', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const result = resolveDraft(hydrated!);
      const draftErrors = result.errorsByGate.draft;
      expect(draftErrors).toHaveLength(0);
      expect(result.isGatePassed('draft')).toBe(true);
    });

    it('role IDs are raw UUIDs', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      for (const role of hydrated!.roles ?? []) {
        expect(role.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it('artifact IDs are raw UUIDs', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      for (const artifact of hydrated!.artifacts ?? []) {
        expect(artifact.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it('artifact.visible_to_role_id is valid role reference', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const roleIds = new Set((hydrated!.roles ?? []).map((r) => r.id));
      for (const artifact of hydrated!.artifacts ?? []) {
        for (const variant of artifact.variants ?? []) {
          if (variant.visible_to_role_id) {
            expect(roleIds.has(variant.visible_to_role_id)).toBe(true);
          }
        }
      }
    });

    it('role_order is preserved', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const roles = hydrated!.roles ?? [];
      expect(roles.length).toBe(2);
      expect(roles[0].role_order).toBe(0);
      expect(roles[1].role_order).toBe(1);
    });

    it('artifact metadata is preserved', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const keypadArtifact = hydrated!.artifacts!.find((a) => a.artifact_type === 'keypad');
      expect(keypadArtifact).toBeDefined();
      expect(keypadArtifact!.metadata).toMatchObject({ correctCode: '1234', maxAttempts: 3 });
    });

    it('artifact.metadata.step_id is valid step reference', async () => {
      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const stepIds = new Set((hydrated!.steps ?? []).map((s) => s.id));
      for (const artifact of hydrated!.artifacts ?? []) {
        const stepId = artifact.metadata?.step_id;
        if (typeof stepId === 'string') {
          expect(stepIds.has(stepId)).toBe(true);
        }
      }
    });
  });

  // =========================================================================
  // SUITE 4: Null/Undefined Contract
  // =========================================================================
  describe('Null/Undefined contract', () => {
    it('step.phase_id null is preserved (not converted to undefined)', async () => {
      if (!supabase || !testTenantId) return;

      const fixture = createSimpleDraft();
      const gameId = fixture.gameId;
      createdGameIds.push(gameId);

      await supabase.from('games').insert({
        id: gameId,
        name: 'Null Test Game',
        short_description: 'Test',
        play_mode: 'basic',
        status: 'draft',
        owner_tenant_id: testTenantId,
        main_purpose_id: testPurposeId,
      });

      const { error } = await callUpsertRpc(supabase, fixture.payload);
      expect(error).toBeNull();

      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      // phase_id should be null, not undefined
      for (const step of hydrated!.steps ?? []) {
        expect(step.phase_id).toBeNull();
        expect(step.phase_id).not.toBeUndefined();
      }
    });

    it('step_order is number, not null or undefined', async () => {
      if (!supabase || !testTenantId) return;

      const fixture = createFacilitatedDraft();
      const gameId = fixture.gameId;
      createdGameIds.push(gameId);

      await supabase.from('games').insert({
        id: gameId,
        name: 'Order Test Game',
        short_description: 'Test',
        play_mode: 'facilitated',
        status: 'draft',
        owner_tenant_id: testTenantId,
        main_purpose_id: testPurposeId,
      });

      const { error } = await callUpsertRpc(supabase, fixture.payload);
      expect(error).toBeNull();

      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      for (const step of hydrated!.steps ?? []) {
        expect(typeof step.step_order).toBe('number');
        expect(step.step_order).not.toBeNull();
        expect(step.step_order).not.toBeUndefined();
      }

      for (const phase of hydrated!.phases ?? []) {
        expect(typeof phase.phase_order).toBe('number');
        expect(phase.phase_order).not.toBeNull();
        expect(phase.phase_order).not.toBeUndefined();
      }
    });

    it('artifact.variants[].visible_to_role_id is null for public visibility', async () => {
      if (!supabase || !testTenantId) return;

      const fixture = createRolesArtifactsDraft();
      const gameId = fixture.gameId;
      createdGameIds.push(gameId);

      await supabase.from('games').insert({
        id: gameId,
        name: 'Visibility Test Game',
        short_description: 'Test',
        play_mode: 'participants',
        status: 'draft',
        owner_tenant_id: testTenantId,
        main_purpose_id: testPurposeId,
      });

      const { error } = await callUpsertRpc(supabase, fixture.payload);
      expect(error).toBeNull();

      const hydrated = await fetchAndHydrate(gameId);
      expect(hydrated).not.toBeNull();

      const publicArtifact = hydrated!.artifacts!.find((a) => a.artifact_type === 'keypad');
      expect(publicArtifact).toBeDefined();
      expect(publicArtifact!.variants![0].visibility).toBe('public');
      expect(publicArtifact!.variants![0].visible_to_role_id).toBeNull();
    });
  });
});

// =============================================================================
// UNIT TESTS (no DB required)
// =============================================================================

describe('Roundtrip Parity - Unit Tests (no DB)', () => {
  it('createSimpleDraft produces valid draft for resolveDraft', () => {
    const { draft } = createSimpleDraft();
    const result = resolveDraft(draft);
    expect(result.isGatePassed('draft')).toBe(true);
  });

  it('createFacilitatedDraft produces valid draft for resolveDraft', () => {
    const { draft } = createFacilitatedDraft();
    const result = resolveDraft(draft);
    expect(result.isGatePassed('draft')).toBe(true);
  });

  it('createRolesArtifactsDraft produces valid draft for resolveDraft', () => {
    const { draft } = createRolesArtifactsDraft();
    const result = resolveDraft(draft);
    expect(result.isGatePassed('draft')).toBe(true);
  });

  it('all fixture UUIDs are valid format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const { draft: simple } = createSimpleDraft();
    for (const step of simple.steps ?? []) {
      expect(step.id).toMatch(uuidRegex);
    }

    const { draft: facilitated } = createFacilitatedDraft();
    for (const phase of facilitated.phases ?? []) {
      expect(phase.id).toMatch(uuidRegex);
    }
    for (const step of facilitated.steps ?? []) {
      expect(step.id).toMatch(uuidRegex);
      if (step.phase_id) expect(step.phase_id).toMatch(uuidRegex);
    }

    const { draft: complex } = createRolesArtifactsDraft();
    for (const role of complex.roles ?? []) {
      expect(role.id).toMatch(uuidRegex);
    }
    for (const artifact of complex.artifacts ?? []) {
      expect(artifact.id).toMatch(uuidRegex);
    }
  });

  it('facilitated draft has valid step->phase references', () => {
    const { draft } = createFacilitatedDraft();
    const phaseIds = new Set((draft.phases ?? []).map((p) => p.id));

    for (const step of draft.steps ?? []) {
      if (step.phase_id) {
        expect(phaseIds.has(step.phase_id)).toBe(true);
      }
    }
  });

  it('complex draft has valid artifact->role references', () => {
    const { draft } = createRolesArtifactsDraft();
    const roleIds = new Set((draft.roles ?? []).map((r) => r.id));

    for (const artifact of draft.artifacts ?? []) {
      for (const variant of artifact.variants ?? []) {
        if (variant.visible_to_role_id) {
          expect(roleIds.has(variant.visible_to_role_id)).toBe(true);
        }
      }
    }
  });
});
