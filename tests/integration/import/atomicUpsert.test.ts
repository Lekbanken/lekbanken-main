/**
 * Atomic Game Upsert Integration Tests
 *
 * Empirical proof that:
 * 1. FK failures cause atomic rollback (no partial writes)
 * 2. Happy path create works with full payload
 * 3. Update path replaces all child content
 * 4. Auth/tenant guards return correct error codes
 *
 * Run: TEST_SUPABASE_URL=... TEST_SUPABASE_SERVICE_ROLE_KEY=... npx vitest tests/integration/import/atomicUpsert.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../../types/supabase';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? '';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? '';

const dbTestsEnabled =
  TEST_SUPABASE_URL.length > 0 && TEST_SUPABASE_SERVICE_KEY.length > 0;

let supabase: SupabaseClient<Database> | null = null;
let testTenantId: string | null = null;
let testGameId: string | null = null;
let testPurposeId: string | null = null;

// Helper types
interface TableCounts {
  steps: number;
  phases: number;
  artifacts: number;
  variants: number;
  triggers: number;
  roles: number;
  materials: number;
  board_config: number;
  secondary_purposes: number;
}

// RPC result type (not in generated types yet)
interface RpcResult {
  ok: boolean;
  game_id?: string;
  code?: string;
  error?: string;
  counts?: {
    steps?: number;
    phases?: number;
    artifacts?: number;
    variants?: number;
    triggers?: number;
    roles?: number;
    materials?: number;
    board_config?: number;
    secondary_purposes?: number;
  };
}

// Helper to call RPC with proper typing
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

// ============================================================================
// HELPERS
// ============================================================================

async function getTableCounts(gameId: string): Promise<TableCounts> {
  if (!supabase) throw new Error('supabase not initialized');

  const [
    { count: steps },
    { count: phases },
    { count: artifacts },
    { count: triggers },
    { count: roles },
    { count: materials },
    { count: board_config },
    { count: secondary_purposes },
  ] = await Promise.all([
    supabase.from('game_steps').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase.from('game_phases').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase.from('game_artifacts').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase.from('game_triggers').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase.from('game_roles').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase.from('game_materials').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase.from('game_board_config').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
    supabase.from('game_secondary_purposes').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
  ]);

  // Get variants count (requires join via artifacts)
  const { data: artifactIds } = await supabase
    .from('game_artifacts')
    .select('id')
    .eq('game_id', gameId);

  let variants = 0;
  if (artifactIds && artifactIds.length > 0) {
    const { count } = await supabase
      .from('game_artifact_variants')
      .select('*', { count: 'exact', head: true })
      .in('artifact_id', artifactIds.map((a) => a.id));
    variants = count ?? 0;
  }

  return {
    steps: steps ?? 0,
    phases: phases ?? 0,
    artifacts: artifacts ?? 0,
    variants,
    triggers: triggers ?? 0,
    roles: roles ?? 0,
    materials: materials ?? 0,
    board_config: board_config ?? 0,
    secondary_purposes: secondary_purposes ?? 0,
  };
}

function createBasePayload(gameId: string, tenantId: string) {
  const phaseId = randomUUID();
  const roleId = randomUUID();
  const artifactId = randomUUID();
  const stepId = randomUUID();
  const triggerId = randomUUID();

  return {
    game_id: gameId,
    is_update: false,
    expected_tenant_id: tenantId,
    import_run_id: randomUUID(),
    phases: [
      {
        id: phaseId,
        phase_order: 1,
        name: 'Test Phase 1',
        phase_type: 'round',
        duration_seconds: 300,
        timer_visible: true,
        timer_style: 'countdown',
        description: 'Test phase description',
        auto_advance: false,
      },
    ],
    steps: [
      {
        id: stepId,
        step_order: 1,
        title: 'Test Step 1',
        body: 'Test step body',
        phase_id: phaseId,
        optional: false,
      },
    ],
    roles: [
      {
        id: roleId,
        role_order: 1,
        name: 'Test Role',
        icon: '🎮',
        color: '#FF0000',
        public_description: 'A test role',
        private_instructions: 'Secret instructions for this role',
        min_count: 1,
        assignment_strategy: 'random',
      },
    ],
    materials: {
      items: ['Penna', 'Papper', 'Tärning'],
      safety_notes: 'Var försiktig med saxen',
      preparation: 'Förbered allt material i förväg',
    },
    board_config: {
      show_game_name: true,
      show_current_phase: true,
      show_timer: true,
      show_participants: true,
      show_public_roles: false,
      show_leaderboard: false,
      show_qr_code: true,
      welcome_message: 'Välkommen till testspelet!',
      theme: 'neutral',
      layout_variant: 'standard',
    },
    artifacts: [
      {
        id: artifactId,
        artifact_order: 1,
        artifact_type: 'card',
        title: 'Test Card',
        description: 'A test artifact card',
        tags: ['test', 'integration'],
        metadata: { difficulty: 'easy' },
      },
    ],
    artifact_variants: [
      {
        artifact_id: artifactId,
        visibility: 'role_private',
        visible_to_role_id: roleId,
        title: 'Role-specific variant',
        body: 'Only this role sees this',
        variant_order: 1,
        metadata: {},
      },
    ],
    triggers: [
      {
        id: triggerId,
        name: 'Phase End Trigger',
        description: 'Triggers when phase ends',
        enabled: true,
        condition: { type: 'phase_end', phase_id: phaseId },
        actions: [{ type: 'show_message', message: 'Phase complete!' }],
        execute_once: true,
        delay_seconds: 0,
        sort_order: 1,
      },
    ],
  };
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

beforeAll(async () => {
  if (!dbTestsEnabled) {
    console.log('⚠️  DB tests skipped: Set TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY);

  // Create test tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: `Test AtomicUpsert ${Date.now()}`,
      type: 'test',
    })
    .select('id')
    .single();

  if (tenantError || !tenant?.id) {
    throw new Error(`Failed to create test tenant: ${tenantError?.message}`);
  }
  testTenantId = tenant.id;

  // Get or create a purpose for game creation
  const { data: purposes } = await supabase.from('purposes').select('id').limit(1);
  if (purposes && purposes.length > 0) {
    testPurposeId = purposes[0].id;
  } else {
    // Create a test purpose
    const { data: purpose, error: purposeError } = await supabase
      .from('purposes')
      .insert({
        name: 'Test Purpose',
        type: 'main',
      })
      .select('id')
      .single();

    if (purposeError || !purpose?.id) {
      throw new Error(`Failed to create test purpose: ${purposeError?.message}`);
    }
    testPurposeId = purpose.id;
  }
});

afterAll(async () => {
  if (!dbTestsEnabled || !supabase || !testTenantId) return;

  // Cleanup: delete all games owned by test tenant (cascades to child tables)
  await supabase.from('games').delete().eq('owner_tenant_id', testTenantId);
  await supabase.from('tenants').delete().eq('id', testTenantId);
});

// Create fresh game before each test
beforeEach(async () => {
  if (!dbTestsEnabled || !supabase || !testTenantId || !testPurposeId) return;

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      name: `Atomic Test Game ${Date.now()}`,
      owner_tenant_id: testTenantId,
      status: 'draft',
      main_purpose_id: testPurposeId,
    })
    .select('id')
    .single();

  if (error || !game?.id) {
    throw new Error(`Failed to create test game: ${error?.message}`);
  }
  testGameId = game.id;
});

afterEach(async () => {
  if (!dbTestsEnabled || !supabase || !testGameId) return;

  // Delete test game and all child content
  await supabase.from('games').delete().eq('id', testGameId);
  testGameId = null;
});

// ============================================================================
// TEST SUITES
// ============================================================================

describe('upsert_game_content_v1 RPC', () => {
  // ==========================================================================
  // 1. ATOMIC ROLLBACK PROOF
  // ==========================================================================
  describe('Atomic Rollback (FK Violation)', () => {
    it.skipIf(!dbTestsEnabled)(
      'should not modify any table when variant references non-existent artifact_id',
      async () => {
        // ARRANGE: Create initial content
        const initialPayload = createBasePayload(testGameId!, testTenantId!);
        const { data: initialResult, error: initialError } = await callUpsertRpc(
          supabase!,
          initialPayload
        );

        expect(initialError).toBeNull();
        expect(initialResult?.ok).toBe(true);

        // Get counts BEFORE failed update
        const countsBefore = await getTableCounts(testGameId!);
        expect(countsBefore.steps).toBe(1);
        expect(countsBefore.phases).toBe(1);
        expect(countsBefore.artifacts).toBe(1);
        expect(countsBefore.variants).toBe(1);

        // ACT: Try update with invalid artifact_id in variant (FK violation)
        const badPayload = {
          game_id: testGameId,
          is_update: true, // This will DELETE existing content first
          expected_tenant_id: testTenantId,
          import_run_id: randomUUID(),
          phases: [{ id: randomUUID(), phase_order: 1, name: 'New Phase' }],
          steps: [],
          roles: [],
          artifacts: [
            { id: randomUUID(), artifact_order: 1, artifact_type: 'card', title: 'New Artifact' },
          ],
          artifact_variants: [
            {
              // THIS artifact_id does NOT exist in the artifacts array → FK violation
              artifact_id: randomUUID(),
              visibility: 'public',
              title: 'Bad Variant',
              body: 'This should fail',
              variant_order: 1,
            },
          ],
          triggers: [],
        };

        const { data: failResult, error: failError } = await callUpsertRpc(
          supabase!,
          badPayload
        );

        // ASSERT: RPC returns error (not exception)
        expect(failError).toBeNull(); // No network error
        expect(failResult?.ok).toBe(false);
        expect(failResult?.code).toMatch(/23503|FK_VIOLATION/); // FK violation code

        // ASSERT: Counts unchanged (atomic rollback)
        const countsAfter = await getTableCounts(testGameId!);
        expect(countsAfter).toEqual(countsBefore);
      }
    );

    it.skipIf(!dbTestsEnabled)(
      'should not modify any table when variant references non-existent role_id',
      async () => {
        // ARRANGE: Create initial content
        const initialPayload = createBasePayload(testGameId!, testTenantId!);
        await callUpsertRpc(supabase!, initialPayload);

        const countsBefore = await getTableCounts(testGameId!);

        // ACT: Try update with invalid role_id in variant
        const artifactId = randomUUID();
        const badPayload = {
          game_id: testGameId,
          is_update: true,
          expected_tenant_id: testTenantId,
          import_run_id: randomUUID(),
          phases: [],
          steps: [],
          roles: [], // No roles!
          artifacts: [{ id: artifactId, artifact_order: 1, artifact_type: 'card', title: 'Artifact' }],
          artifact_variants: [
            {
              artifact_id: artifactId,
              visibility: 'role_private',
              visible_to_role_id: randomUUID(), // Non-existent role → FK violation
              title: 'Bad Variant',
              body: 'Should fail',
              variant_order: 1,
            },
          ],
          triggers: [],
        };

        const { data: failResult } = await callUpsertRpc(supabase!, badPayload);

        // ASSERT: Failed
        expect(failResult?.ok).toBe(false);

        // ASSERT: Rollback - counts unchanged
        const countsAfter = await getTableCounts(testGameId!);
        expect(countsAfter).toEqual(countsBefore);
      }
    );
  });

  // ==========================================================================
  // 2. HAPPY PATH CREATE
  // ==========================================================================
  describe('Happy Path Create', () => {
    it.skipIf(!dbTestsEnabled)(
      'should create all content with full payload (tags, materials, variants, triggers)',
      async () => {
        const payload = createBasePayload(testGameId!, testTenantId!);

        const { data: result, error } = await callUpsertRpc(supabase!, payload);

        // ASSERT: Success
        expect(error).toBeNull();
        expect(result?.ok).toBe(true);
        expect(result?.game_id).toBe(testGameId);

        // ASSERT: Counts
        expect(result?.counts?.phases).toBe(1);
        expect(result?.counts?.steps).toBe(1);
        expect(result?.counts?.artifacts).toBe(1);
        expect(result?.counts?.variants).toBe(1);
        expect(result?.counts?.triggers).toBe(1);
        expect(result?.counts?.roles).toBe(1);

        // Verify in database
        const counts = await getTableCounts(testGameId!);
        expect(counts.phases).toBe(1);
        expect(counts.steps).toBe(1);
        expect(counts.artifacts).toBe(1);
        expect(counts.variants).toBe(1);
        expect(counts.triggers).toBe(1);
        expect(counts.roles).toBe(1);
        expect(counts.materials).toBe(1);
        expect(counts.board_config).toBe(1);

        // Verify tags array was stored correctly
        const { data: artifacts } = await supabase!
          .from('game_artifacts')
          .select('tags')
          .eq('game_id', testGameId!);
        expect(artifacts?.[0]?.tags).toEqual(['test', 'integration']);

        // Verify materials items array
        const { data: materials } = await supabase!
          .from('game_materials')
          .select('items')
          .eq('game_id', testGameId!);
        expect(materials?.[0]?.items).toEqual(['Penna', 'Papper', 'Tärning']);

        // Verify trigger condition/actions
        const { data: triggers } = await supabase!
          .from('game_triggers')
          .select('condition, actions')
          .eq('game_id', testGameId!);
        expect(triggers?.[0]?.condition).toHaveProperty('type', 'phase_end');
        expect(triggers?.[0]?.actions).toHaveLength(1);
        expect((triggers?.[0]?.actions as unknown[])?.[0]).toHaveProperty('type', 'show_message');
      }
    );
  });

  // ==========================================================================
  // 3. UPDATE PATH SUCCESS
  // ==========================================================================
  describe('Update Path', () => {
    it.skipIf(!dbTestsEnabled)(
      'should replace all old content with new content (is_update=true)',
      async () => {
        // ARRANGE: Create initial content (3 steps, 2 phases)
        const initialPayload = createBasePayload(testGameId!, testTenantId!);
        // Add more steps/phases
        const phase2Id = randomUUID();
        initialPayload.phases.push({
          id: phase2Id,
          phase_order: 2,
          name: 'Initial Phase 2',
          phase_type: 'debrief',
        } as typeof initialPayload.phases[0]);
        initialPayload.steps.push(
          { id: randomUUID(), step_order: 2, title: 'Initial Step 2', body: '', phase_id: phase2Id, optional: false },
          { id: randomUUID(), step_order: 3, title: 'Initial Step 3', body: '', phase_id: phase2Id, optional: false }
        );

        await callUpsertRpc(supabase!, initialPayload);

        // Verify initial state
        const countsBefore = await getTableCounts(testGameId!);
        expect(countsBefore.phases).toBe(2);
        expect(countsBefore.steps).toBe(3);

        // ACT: Update with completely different content
        const newPhaseId = randomUUID();
        const updatePayload = {
          game_id: testGameId,
          is_update: true, // ← Key: this triggers delete-then-insert
          expected_tenant_id: testTenantId,
          import_run_id: randomUUID(),
          phases: [
            { id: newPhaseId, phase_order: 1, name: 'Replacement Phase', phase_type: 'intro' },
          ],
          steps: [
            { id: randomUUID(), step_order: 1, title: 'Replacement Step', body: 'New content', phase_id: newPhaseId, optional: true },
          ],
          roles: [],
          artifacts: [],
          artifact_variants: [],
          triggers: [],
        };

        const { data: result, error } = await callUpsertRpc(supabase!, updatePayload);

        // ASSERT: Success
        expect(error).toBeNull();
        expect(result?.ok).toBe(true);

        // ASSERT: New counts (old content gone, new content present)
        const countsAfter = await getTableCounts(testGameId!);
        expect(countsAfter.phases).toBe(1);
        expect(countsAfter.steps).toBe(1);
        expect(countsAfter.artifacts).toBe(0); // Removed
        expect(countsAfter.variants).toBe(0); // Removed
        expect(countsAfter.triggers).toBe(0); // Removed
        expect(countsAfter.roles).toBe(0); // Removed

        // Verify new content
        const { data: phases } = await supabase!
          .from('game_phases')
          .select('name')
          .eq('game_id', testGameId!);
        expect(phases?.[0]?.name).toBe('Replacement Phase');
      }
    );
  });

  // ==========================================================================
  // 4. AUTH / TENANT GUARDS
  // ==========================================================================
  describe('Auth & Tenant Guards', () => {
    it.skipIf(!dbTestsEnabled)(
      'should return TENANT_MISMATCH when expected_tenant_id does not match',
      async () => {
        const payload = {
          game_id: testGameId,
          is_update: false,
          expected_tenant_id: randomUUID(), // Wrong tenant!
          import_run_id: randomUUID(),
          phases: [],
          steps: [],
          roles: [],
          artifacts: [],
          artifact_variants: [],
          triggers: [],
        };

        const { data: result, error } = await callUpsertRpc(supabase!, payload);

        expect(error).toBeNull();
        expect(result?.ok).toBe(false);
        expect(result?.code).toBe('TENANT_MISMATCH');

        // Verify no writes happened
        const counts = await getTableCounts(testGameId!);
        expect(counts.phases).toBe(0);
      }
    );

    it.skipIf(!dbTestsEnabled)(
      'should return GAME_NOT_FOUND for non-existent game_id',
      async () => {
        const payload = {
          game_id: randomUUID(), // Non-existent
          is_update: false,
          expected_tenant_id: testTenantId,
          import_run_id: randomUUID(),
          phases: [],
          steps: [],
          roles: [],
          artifacts: [],
          artifact_variants: [],
          triggers: [],
        };

        const { data: result, error } = await callUpsertRpc(supabase!, payload);

        expect(error).toBeNull();
        expect(result?.ok).toBe(false);
        expect(result?.code).toBe('GAME_NOT_FOUND');
      }
    );

    it.skipIf(!dbTestsEnabled)(
      'should return MISSING_GAME_ID when game_id is null',
      async () => {
        const payload = {
          // No game_id!
          is_update: false,
          expected_tenant_id: testTenantId,
          phases: [],
          steps: [],
        };

        const { data: result, error } = await callUpsertRpc(supabase!, payload);

        expect(error).toBeNull();
        expect(result?.ok).toBe(false);
        expect(result?.code).toBe('MISSING_GAME_ID');
      }
    );
  });

  // ==========================================================================
  // 5. EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    it.skipIf(!dbTestsEnabled)(
      'should handle empty arrays gracefully',
      async () => {
        const payload = {
          game_id: testGameId,
          is_update: false,
          expected_tenant_id: testTenantId,
          import_run_id: randomUUID(),
          phases: [],
          steps: [],
          roles: [],
          artifacts: [],
          artifact_variants: [],
          triggers: [],
        };

        const { data: result, error } = await callUpsertRpc(supabase!, payload);

        expect(error).toBeNull();
        expect(result?.ok).toBe(true);
        expect(result?.counts?.phases).toBe(0);
        expect(result?.counts?.steps).toBe(0);
      }
    );

    it.skipIf(!dbTestsEnabled)(
      'should handle materials without items array',
      async () => {
        const payload = {
          game_id: testGameId,
          is_update: false,
          expected_tenant_id: testTenantId,
          import_run_id: randomUUID(),
          phases: [],
          steps: [],
          roles: [],
          artifacts: [],
          artifact_variants: [],
          triggers: [],
          materials: {
            safety_notes: 'Just a note, no items',
          },
        };

        const { data: result, error } = await callUpsertRpc(supabase!, payload);

        expect(error).toBeNull();
        expect(result?.ok).toBe(true);

        const { data: materials } = await supabase!
          .from('game_materials')
          .select('items, safety_notes')
          .eq('game_id', testGameId!);

        expect(materials?.[0]?.items).toEqual([]);
        expect(materials?.[0]?.safety_notes).toBe('Just a note, no items');
      }
    );
  });

  // ==========================================================================
  // 6. RLS/AUTH SECURITY (post-migration: authenticated revoked)
  // ==========================================================================
  describe('RLS Security', () => {
    it.skipIf(!dbTestsEnabled)(
      'should reject RPC call from anon client (no auth)',
      async () => {
        // Create anon client (no service_role key)
        const anonClient = createClient<Database>(
          TEST_SUPABASE_URL,
          // Use a dummy anon key - this simulates unauthenticated access
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.Jf7t8Q-hJfJqZsMQZz7aSYdJBPJZ7RoZ8B7y7J7G7hQ'
        );

        const payload = {
          game_id: testGameId,
          is_update: false,
          expected_tenant_id: testTenantId,
          import_run_id: randomUUID(),
          phases: [],
          steps: [],
          roles: [],
          artifacts: [],
          artifact_variants: [],
          triggers: [],
        };

        // Try to call RPC with anon client
        const { data, error } = await callUpsertRpc(anonClient, payload);

        // Should fail with permission denied or auth error
        // After migration: anon doesn't have execute permission
        // The error could be from Postgres (permission denied) or RPC (AUTH_REQUIRED)
        const failed = error !== null || data?.ok === false;
        expect(failed).toBe(true);

        // Verify no writes occurred
        const counts = await getTableCounts(testGameId!);
        expect(counts.phases).toBe(0);
        expect(counts.steps).toBe(0);
      }
    );
  });
});
