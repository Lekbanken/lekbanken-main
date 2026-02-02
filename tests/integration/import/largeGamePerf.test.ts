/**
 * Large Game Performance Test
 *
 * Purpose: Measure RPC performance with large payloads to establish guardrails
 * and catch performance regressions early.
 *
 * Tested payload sizes:
 * - 200 phases + 200 steps
 * - 500-1500 artifacts
 * - 2000-5000 variants
 * - 500 triggers
 * - 50 roles
 *
 * Logged metrics:
 * - rpc_elapsed_ms
 * - payload_bytes
 * - counts per table
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Test Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

// Performance thresholds (loose to start, tighten after baseline)
const THRESHOLDS = {
  MEDIUM_GAME_MS: 10_000,  // 10s for ~500 artifacts, ~2000 variants
  LARGE_GAME_MS: 30_000,   // 30s for monster game (loose threshold)
  PAYLOAD_MAX_MB: 10,      // Max payload size in MB
};

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

interface RpcResult {
  ok: boolean;
  error?: string;
  code?: string;
  game_id?: string;
  counts?: {
    steps: number;
    phases: number;
    artifacts: number;
    variants: number;
    triggers: number;
    roles: number;
  };
}

interface PerfMetrics {
  rpc_elapsed_ms: number;
  payload_bytes: number;
  counts: {
    phases: number;
    steps: number;
    roles: number;
    artifacts: number;
    triggers: number;
    variants: number;
  };
}

function generateLargePayload(config: {
  gameId: string;
  phases: number;
  stepsPerPhase: number;
  roles: number;
  artifacts: number;
  variantsPerArtifact: number;
  triggers: number;
}) {
  const phases = Array.from({ length: config.phases }, (_, i) => ({
    id: randomUUID(),
    name: `Phase ${i + 1}`,
    phase_type: 'round',
    description: `Description for phase ${i + 1}. `.repeat(5),
    phase_order: i,
    duration_seconds: 300 + i * 10,
    timer_visible: true,
    timer_style: 'countdown',
    auto_advance: false,
  }));

  const steps = phases.flatMap((phase, pi) =>
    Array.from({ length: config.stepsPerPhase }, (_, si) => ({
      id: randomUUID(),
      phase_id: phase.id,
      step_order: pi * config.stepsPerPhase + si,
      title: `Step ${pi * config.stepsPerPhase + si + 1}`,
      body: `Body content for step. `.repeat(10),
      duration_seconds: 60 + (si % 10) * 30,
      optional: false,
    }))
  );

  const roles = Array.from({ length: config.roles }, (_, i) => ({
    id: randomUUID(),
    name: `Role ${i + 1}`,
    role_order: i,
    icon: '🎮',
    color: `#${((i * 123456) % 0xffffff).toString(16).padStart(6, '0')}`,
    public_description: `Public description for role ${i + 1}. `.repeat(3),
    private_instructions: `Secret instructions for role ${i + 1}. Do X, Y, Z.`,
    min_count: 1,
    max_count: 10,
    assignment_strategy: 'random',
  }));

  const artifacts = Array.from({ length: config.artifacts }, (_, i) => ({
    id: randomUUID(),
    title: `Artifact ${i + 1}`,
    description: `Description for artifact ${i + 1}. `.repeat(3),
    artifact_type: i % 2 === 0 ? 'card' : 'token',
    artifact_order: i,
    tags: ['perf-test', `batch-${Math.floor(i / 100)}`],
    metadata: { difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard' },
  }));

  // artifact_variants format matching actual schema
  const artifact_variants = artifacts.flatMap((artifact, ai) =>
    Array.from({ length: config.variantsPerArtifact }, (_, vi) => ({
      artifact_id: artifact.id,
      visibility: vi % 2 === 0 ? 'public' : 'role_private',
      visible_to_role_id: vi % 2 === 1 ? roles[vi % roles.length]?.id : null,
      title: `Variant ${vi + 1} for Artifact ${ai + 1}`,
      body: `Content for variant. `.repeat(5),
      variant_order: vi,
      metadata: {},
    }))
  );

  const triggers = Array.from({ length: config.triggers }, (_, i) => ({
    id: randomUUID(),
    name: `Trigger ${i + 1}`,
    description: `Description for trigger ${i + 1}`,
    enabled: true,
    condition: { type: 'time', delay_seconds: 30 + i },
    actions: [{ type: 'notify', message: `Trigger ${i + 1} fired` }],
    execute_once: i % 2 === 0,
    delay_seconds: 30 + i,
    sort_order: i,
  }));

  return {
    game_id: config.gameId,
    is_update: false,
    import_run_id: randomUUID(),
    phases,
    steps,
    roles,
    artifacts,
    artifact_variants,
    triggers,
  };
}

async function callUpsertRpc(
  client: SupabaseClient,
  payload: Record<string, unknown>
): Promise<RpcResult> {
  const { data, error } = await client.rpc('upsert_game_content_v1', {
    p_payload: payload,
  });

  if (error) {
    return { ok: false, error: error.message, code: 'RPC_ERROR' };
  }

  return data as RpcResult;
}

function logMetrics(label: string, metrics: PerfMetrics) {
  const payloadMB = (metrics.payload_bytes / 1024 / 1024).toFixed(2);
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ PERFORMANCE TEST: ${label.padEnd(55)}│
├─────────────────────────────────────────────────────────────────────────────┤
│ RPC Elapsed:    ${String(metrics.rpc_elapsed_ms).padStart(8)} ms                                       │
│ Payload Size:   ${payloadMB.padStart(8)} MB                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Counts:                                                                     │
│   Phases:       ${String(metrics.counts.phases).padStart(8)}                                           │
│   Steps:        ${String(metrics.counts.steps).padStart(8)}                                           │
│   Roles:        ${String(metrics.counts.roles).padStart(8)}                                           │
│   Artifacts:    ${String(metrics.counts.artifacts).padStart(8)}                                           │
│   Triggers:     ${String(metrics.counts.triggers).padStart(8)}                                           │
│   Variants:     ${String(metrics.counts.variants).padStart(8)}                                           │
└─────────────────────────────────────────────────────────────────────────────┘
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('Large Game Performance Tests', () => {
  let serviceClient: SupabaseClient;
  let testTenantId: string;
  let testPurposeId: string;
  const createdGameIds: string[] = [];

  beforeAll(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error(
        'Missing TEST_SUPABASE_URL or TEST_SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Create test tenant
    testTenantId = randomUUID();
    const { error: tenantError } = await serviceClient.from('tenants').insert({
      id: testTenantId,
      name: `perf-test-tenant-${Date.now()}`,
      type: 'test',
    });
    if (tenantError) {
      console.error('Failed to create tenant:', tenantError);
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    // Get or create purpose
    const { data: purposes } = await serviceClient
      .from('purposes')
      .select('id')
      .limit(1);

    if (purposes && purposes.length > 0) {
      testPurposeId = purposes[0].id;
    } else {
      testPurposeId = randomUUID();
      const { error: purposeError } = await serviceClient.from('purposes').insert({
        id: testPurposeId,
        name: 'Perf Test Purpose',
        type: 'main',
      });
      if (purposeError) {
        console.error('Failed to create purpose:', purposeError);
        throw new Error(`Failed to create purpose: ${purposeError.message}`);
      }
    }
  });

  afterAll(async () => {
    // Cleanup: delete created games (cascades to related tables)
    if (createdGameIds.length > 0) {
      await serviceClient.from('games').delete().in('id', createdGameIds);
    }

    // Delete test tenant
    if (testTenantId) {
      await serviceClient.from('tenants').delete().eq('id', testTenantId);
    }
  });

  async function createTestGame(): Promise<string> {
    const gameId = randomUUID();
    const { error } = await serviceClient.from('games').insert({
      id: gameId,
      owner_tenant_id: testTenantId,
      name: `Perf Test Game ${Date.now()}`,
      main_purpose_id: testPurposeId,
      status: 'draft',
    });
    if (error) {
      console.error('Failed to create test game:', error);
      throw new Error(`Failed to create test game: ${error.message}`);
    }
    createdGameIds.push(gameId);
    return gameId;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test: Medium Game (baseline)
  // ───────────────────────────────────────────────────────────────────────────
  it('handles medium game (20 phases, 100 steps, 500 artifacts, 2000 variants)', async () => {
    const gameId = await createTestGame();

    const payload = generateLargePayload({
      gameId,
      phases: 20,
      stepsPerPhase: 5, // 100 steps total
      roles: 10,
      artifacts: 500,
      variantsPerArtifact: 4, // 2000 variants total
      triggers: 100,
    });

    const payloadJson = JSON.stringify(payload);
    const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');

    const startTime = Date.now();
    const result = await callUpsertRpc(serviceClient, payload);
    const elapsedMs = Date.now() - startTime;

    const metrics: PerfMetrics = {
      rpc_elapsed_ms: elapsedMs,
      payload_bytes: payloadBytes,
      counts: {
        phases: payload.phases.length,
        steps: payload.steps.length,
        roles: payload.roles.length,
        artifacts: payload.artifacts.length,
        triggers: payload.triggers.length,
        variants: payload.artifact_variants.length,
      },
    };

    logMetrics('Medium Game', metrics);

    // Assertions
    expect(result.ok).toBe(true);
    expect(result.counts?.phases).toBe(20);
    expect(result.counts?.steps).toBe(100);
    expect(result.counts?.artifacts).toBe(500);
    expect(result.counts?.variants).toBe(2000);

    // Performance threshold
    expect(elapsedMs).toBeLessThan(THRESHOLDS.MEDIUM_GAME_MS);
  }, 60_000); // 60s timeout

  // ───────────────────────────────────────────────────────────────────────────
  // Test: Large Game (stress test)
  // ───────────────────────────────────────────────────────────────────────────
  it('handles large game (200 phases, 400 steps, 1000 artifacts, 4000 variants, 500 triggers)', async () => {
    const gameId = await createTestGame();

    const payload = generateLargePayload({
      gameId,
      phases: 200,
      stepsPerPhase: 2, // 400 steps total
      roles: 50,
      artifacts: 1000,
      variantsPerArtifact: 4, // 4000 variants total
      triggers: 500,
    });

    const payloadJson = JSON.stringify(payload);
    const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');

    const startTime = Date.now();
    const result = await callUpsertRpc(serviceClient, payload);
    const elapsedMs = Date.now() - startTime;

    const metrics: PerfMetrics = {
      rpc_elapsed_ms: elapsedMs,
      payload_bytes: payloadBytes,
      counts: {
        phases: payload.phases.length,
        steps: payload.steps.length,
        roles: payload.roles.length,
        artifacts: payload.artifacts.length,
        triggers: payload.triggers.length,
        variants: payload.artifact_variants.length,
      },
    };

    logMetrics('Large Game', metrics);

    // Assertions
    expect(result.ok).toBe(true);
    expect(result.counts?.phases).toBe(200);
    expect(result.counts?.steps).toBe(400);
    expect(result.counts?.artifacts).toBe(1000);
    expect(result.counts?.variants).toBe(4000);
    expect(result.counts?.triggers).toBe(500);

    // Performance threshold (loose)
    expect(elapsedMs).toBeLessThan(THRESHOLDS.LARGE_GAME_MS);

    // Payload size check
    const payloadMB = payloadBytes / 1024 / 1024;
    expect(payloadMB).toBeLessThan(THRESHOLDS.PAYLOAD_MAX_MB);
  }, 120_000); // 120s timeout

  // ───────────────────────────────────────────────────────────────────────────
  // Test: Update path performance
  // ───────────────────────────────────────────────────────────────────────────
  it('handles large game UPDATE (delete + re-insert)', async () => {
    const gameId = await createTestGame();

    // First: insert medium data
    const initialPayload = generateLargePayload({
      gameId,
      phases: 50,
      stepsPerPhase: 2,
      roles: 20,
      artifacts: 300,
      variantsPerArtifact: 3,
      triggers: 100,
    });

    const insertResult = await callUpsertRpc(serviceClient, initialPayload);
    expect(insertResult.ok).toBe(true);

    // Second: update with larger data
    const updatePayload = generateLargePayload({
      gameId,
      phases: 100,
      stepsPerPhase: 3,
      roles: 30,
      artifacts: 500,
      variantsPerArtifact: 4,
      triggers: 200,
    });
    updatePayload.is_update = true;

    const payloadJson = JSON.stringify(updatePayload);
    const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');

    const startTime = Date.now();
    const result = await callUpsertRpc(serviceClient, updatePayload);
    const elapsedMs = Date.now() - startTime;

    const metrics: PerfMetrics = {
      rpc_elapsed_ms: elapsedMs,
      payload_bytes: payloadBytes,
      counts: {
        phases: updatePayload.phases.length,
        steps: updatePayload.steps.length,
        roles: updatePayload.roles.length,
        artifacts: updatePayload.artifacts.length,
        triggers: updatePayload.triggers.length,
        variants: updatePayload.artifact_variants.length,
      },
    };

    logMetrics('Large Game UPDATE', metrics);

    // Assertions
    expect(result.ok).toBe(true);
    expect(result.counts?.phases).toBe(100);
    expect(result.counts?.steps).toBe(300);
    expect(result.counts?.artifacts).toBe(500);
    expect(result.counts?.variants).toBe(2000);

    // Update should be slower due to deletes, but still within threshold
    expect(elapsedMs).toBeLessThan(THRESHOLDS.LARGE_GAME_MS);
  }, 120_000);

  // ───────────────────────────────────────────────────────────────────────────
  // Test: Payload size edge case
  // ───────────────────────────────────────────────────────────────────────────
  it('measures payload size boundaries', async () => {
    const gameId = await createTestGame();

    // Generate payload with lots of content
    const payload = generateLargePayload({
      gameId,
      phases: 100,
      stepsPerPhase: 5, // 500 steps with body text
      roles: 30,
      artifacts: 500,
      variantsPerArtifact: 5, // 2500 variants with content
      triggers: 200,
    });

    const payloadJson = JSON.stringify(payload);
    const payloadBytes = Buffer.byteLength(payloadJson, 'utf8');
    const payloadMB = payloadBytes / 1024 / 1024;

    console.log(`\n📦 Payload size: ${payloadMB.toFixed(2)} MB (${payloadBytes} bytes)\n`);

    // Just verify we can measure it - actual execution tested above
    expect(payloadMB).toBeGreaterThan(0);
    expect(payloadMB).toBeLessThan(THRESHOLDS.PAYLOAD_MAX_MB);
  });
});
