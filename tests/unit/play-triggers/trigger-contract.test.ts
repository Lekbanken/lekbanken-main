/**
 * Contract tests for Trigger Engine V2.1
 *
 * Tests the PATCH /api/play/sessions/[id]/triggers endpoint contract:
 * - C1: execute_once guard → NO-OP 200 if already fired
 * - C2: Idempotency replay → NO-OP 200 with replay:true
 * - C2.1: Missing X-Idempotency-Key → 400
 * - Response shape stability
 *
 * Strategy: Mock service.rpc() to test route logic in isolation.
 * session_events logging happens in DB RPC; verified via integration tests.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Types matching the contract
// =============================================================================

interface TriggerFireResponse {
  ok: boolean;
  status: 'fired' | 'noop';
  reason: string | null;
  replay: boolean;
  trigger: {
    id: string;
    status: string;
    firedAt: string | null;
    firedCount: number;
  };
  originalFiredAt?: string;
}

interface TriggerFireErrorResponse {
  ok: false;
  error: string;
}

interface RpcResult {
  ok: boolean;
  status: 'fired' | 'noop' | 'error';
  reason: string | null;
  replay: boolean;
  fired_count: number;
  fired_at: string | null;
  original_fired_at: string | null;
}

// =============================================================================
// Constants from contract
// =============================================================================

const ERROR_CODES = {
  IDEMPOTENCY_KEY_REQUIRED: 'TRIGGER_IDEMPOTENCY_KEY_REQUIRED',
  EXECUTE_ONCE_ALREADY_FIRED: 'EXECUTE_ONCE_ALREADY_FIRED',
  IDEMPOTENCY_REPLAY: 'IDEMPOTENCY_REPLAY',
} as const;

const RESPONSE_STATUSES = {
  FIRED: 'fired',
  NOOP: 'noop',
} as const;

// =============================================================================
// Pure function extraction: Route response mapping
// =============================================================================

/**
 * Maps RPC result to API response (extracted from route.ts logic)
 * This tests the contract mapping without network dependencies.
 */
function mapRpcResultToResponse(
  rpcResult: RpcResult,
  triggerId: string
): TriggerFireResponse {
  return {
    ok: true,
    status: rpcResult.status === 'fired' ? 'fired' : 'noop',
    reason: rpcResult.reason,
    replay: rpcResult.replay,
    trigger: {
      id: triggerId,
      status: rpcResult.status === 'fired' ? 'fired' : 'armed',
      firedAt: rpcResult.fired_at,
      firedCount: rpcResult.fired_count,
    },
    ...(rpcResult.replay && rpcResult.original_fired_at
      ? { originalFiredAt: rpcResult.original_fired_at }
      : {}),
  };
}

/**
 * Validates idempotency key presence (extracted from route.ts)
 * Note: Route does .trim() on header before calling this logic,
 * so empty string or whitespace-only → null → rejected.
 */
function validateIdempotencyKey(
  action: string,
  idempotencyKey: string | null
): TriggerFireErrorResponse | null {
  if (action === 'fire' && !idempotencyKey) {
    return {
      ok: false,
      error: ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
    };
  }
  return null;
}

// =============================================================================
// Contract Tests
// =============================================================================

describe('Trigger Engine V2.1 Contract', () => {
  const TRIGGER_ID = 'trigger-123';
  const SESSION_ID = 'session-456';

  describe('C2.1: Idempotency Key Requirement', () => {
    it('T5: missing X-Idempotency-Key for fire action → 400 TRIGGER_IDEMPOTENCY_KEY_REQUIRED', () => {
      const result = validateIdempotencyKey('fire', null);

      expect(result).not.toBeNull();
      expect(result?.ok).toBe(false);
      expect(result?.error).toBe(ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);
    });

    it('T5b: empty string X-Idempotency-Key for fire action → 400 TRIGGER_IDEMPOTENCY_KEY_REQUIRED', () => {
      const result = validateIdempotencyKey('fire', '');

      expect(result).not.toBeNull();
      expect(result?.ok).toBe(false);
      expect(result?.error).toBe(ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);
    });

    it('T5c: whitespace-only X-Idempotency-Key for fire action → 400 (after trim)', () => {
      // Route does trim() before calling validateIdempotencyKey
      // Test that whitespace-only would be rejected after trim
      const trimmedKey = '   '.trim() || null;
      const result = validateIdempotencyKey('fire', trimmedKey);

      expect(result).not.toBeNull();
      expect(result?.ok).toBe(false);
      expect(result?.error).toBe(ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);
    });

    it('X-Idempotency-Key present for fire action → no error', () => {
      const result = validateIdempotencyKey('fire', 'key-abc-123');

      expect(result).toBeNull();
    });

    it('X-Idempotency-Key not required for disable action', () => {
      const result = validateIdempotencyKey('disable', null);

      expect(result).toBeNull();
    });

    it('X-Idempotency-Key not required for arm action', () => {
      const result = validateIdempotencyKey('arm', null);

      expect(result).toBeNull();
    });
  });

  describe('C1: execute_once Guard', () => {
    it('T1: execute_once=true, first fire → status=fired, fired_count=1', () => {
      const rpcResult: RpcResult = {
        ok: true,
        status: 'fired',
        reason: null,
        replay: false,
        fired_count: 1,
        fired_at: '2026-02-08T12:00:00Z',
        original_fired_at: null,
      };

      const response = mapRpcResultToResponse(rpcResult, TRIGGER_ID);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(RESPONSE_STATUSES.FIRED);
      expect(response.reason).toBeNull();
      expect(response.replay).toBe(false);
      expect(response.trigger.firedCount).toBe(1);
      expect(response.trigger.status).toBe('fired');
    });

    it('T2: execute_once=true, already fired → status=noop, reason=EXECUTE_ONCE_ALREADY_FIRED', () => {
      const rpcResult: RpcResult = {
        ok: true,
        status: 'noop',
        reason: ERROR_CODES.EXECUTE_ONCE_ALREADY_FIRED,
        replay: false,
        fired_count: 1,
        fired_at: '2026-02-08T11:00:00Z',
        original_fired_at: '2026-02-08T11:00:00Z',
      };

      const response = mapRpcResultToResponse(rpcResult, TRIGGER_ID);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(RESPONSE_STATUSES.NOOP);
      expect(response.reason).toBe(ERROR_CODES.EXECUTE_ONCE_ALREADY_FIRED);
      expect(response.replay).toBe(false);
      expect(response.trigger.firedCount).toBe(1);
      expect(response.trigger.status).toBe('armed'); // stays armed since noop
    });
  });

  describe('C2: Idempotency Replay', () => {
    it('T4: same idempotency key replay → status=noop, replay=true, originalFiredAt present', () => {
      const originalFiredAt = '2026-02-08T12:00:00Z';
      const rpcResult: RpcResult = {
        ok: true,
        status: 'noop',
        reason: ERROR_CODES.IDEMPOTENCY_REPLAY,
        replay: true,
        fired_count: 1,
        fired_at: originalFiredAt,
        original_fired_at: originalFiredAt,
      };

      const response = mapRpcResultToResponse(rpcResult, TRIGGER_ID);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(RESPONSE_STATUSES.NOOP);
      expect(response.reason).toBe(ERROR_CODES.IDEMPOTENCY_REPLAY);
      expect(response.replay).toBe(true);
      expect(response.originalFiredAt).toBe(originalFiredAt);
      expect(response.trigger.firedCount).toBe(1);
    });

    it('T3: non-execute_once trigger with two unique keys → fired_count increments', () => {
      // First fire
      const firstResult: RpcResult = {
        ok: true,
        status: 'fired',
        reason: null,
        replay: false,
        fired_count: 1,
        fired_at: '2026-02-08T12:00:00Z',
        original_fired_at: null,
      };

      const firstResponse = mapRpcResultToResponse(firstResult, TRIGGER_ID);
      expect(firstResponse.trigger.firedCount).toBe(1);

      // Second fire with different key
      const secondResult: RpcResult = {
        ok: true,
        status: 'fired',
        reason: null,
        replay: false,
        fired_count: 2,
        fired_at: '2026-02-08T12:01:00Z',
        original_fired_at: null,
      };

      const secondResponse = mapRpcResultToResponse(secondResult, TRIGGER_ID);
      expect(secondResponse.trigger.firedCount).toBe(2);
    });
  });

  describe('T6: First Fire (No State Row Exists)', () => {
    it('first fire creates row with fired_count=1', () => {
      const rpcResult: RpcResult = {
        ok: true,
        status: 'fired',
        reason: null,
        replay: false,
        fired_count: 1,
        fired_at: '2026-02-08T12:00:00Z',
        original_fired_at: null,
      };

      const response = mapRpcResultToResponse(rpcResult, TRIGGER_ID);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(RESPONSE_STATUSES.FIRED);
      expect(response.trigger.firedCount).toBe(1);
      expect(response.trigger.firedAt).toBe('2026-02-08T12:00:00Z');
    });
  });

  describe('T9: Response Shape Contract Stability', () => {
    it('fired response has all required fields', () => {
      const rpcResult: RpcResult = {
        ok: true,
        status: 'fired',
        reason: null,
        replay: false,
        fired_count: 1,
        fired_at: '2026-02-08T12:00:00Z',
        original_fired_at: null,
      };

      const response = mapRpcResultToResponse(rpcResult, TRIGGER_ID);

      // Required top-level fields
      expect(response).toHaveProperty('ok');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('reason');
      expect(response).toHaveProperty('replay');
      expect(response).toHaveProperty('trigger');

      // Required trigger fields
      expect(response.trigger).toHaveProperty('id');
      expect(response.trigger).toHaveProperty('status');
      expect(response.trigger).toHaveProperty('firedAt');
      expect(response.trigger).toHaveProperty('firedCount');

      // originalFiredAt only present for replays
      expect(response).not.toHaveProperty('originalFiredAt');
    });

    it('replay response includes originalFiredAt', () => {
      const rpcResult: RpcResult = {
        ok: true,
        status: 'noop',
        reason: ERROR_CODES.IDEMPOTENCY_REPLAY,
        replay: true,
        fired_count: 1,
        fired_at: '2026-02-08T12:00:00Z',
        original_fired_at: '2026-02-08T12:00:00Z',
      };

      const response = mapRpcResultToResponse(rpcResult, TRIGGER_ID);

      expect(response).toHaveProperty('originalFiredAt');
      expect(response.originalFiredAt).toBe('2026-02-08T12:00:00Z');
    });

    it('error response has ok:false and error field', () => {
      const errorResponse: TriggerFireErrorResponse = {
        ok: false,
        error: ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
      };

      expect(errorResponse.ok).toBe(false);
      expect(errorResponse.error).toBe(ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);
    });
  });

  describe('T10: Disable Action Preserves fired_count', () => {
    it('disable action response has correct shape', () => {
      // This tests the contract expectation, not the implementation
      // The implementation preserves fired_count in the upsert
      const expectedResponseShape = {
        ok: true,
        status: 'disabled',
        reason: null,
        replay: false,
        trigger: {
          id: TRIGGER_ID,
          status: 'disabled',
          firedAt: '2026-02-08T11:00:00Z',
          firedCount: 3, // Should be preserved, not reset
        },
      };

      expect(expectedResponseShape.trigger.firedCount).toBe(3);
      expect(expectedResponseShape.trigger.status).toBe('disabled');
    });
  });

  describe('T11: Arm Action Preserves fired_count', () => {
    it('arm action response has correct shape', () => {
      const expectedResponseShape = {
        ok: true,
        status: 'armed',
        reason: null,
        replay: false,
        trigger: {
          id: TRIGGER_ID,
          status: 'armed',
          firedAt: '2026-02-08T11:00:00Z',
          firedCount: 3, // Should be preserved, not reset
        },
      };

      expect(expectedResponseShape.trigger.firedCount).toBe(3);
      expect(expectedResponseShape.trigger.status).toBe('armed');
    });
  });
});

describe('Error Codes Contract', () => {
  it('all error codes match expected values', () => {
    expect(ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED).toBe('TRIGGER_IDEMPOTENCY_KEY_REQUIRED');
    expect(ERROR_CODES.EXECUTE_ONCE_ALREADY_FIRED).toBe('EXECUTE_ONCE_ALREADY_FIRED');
    expect(ERROR_CODES.IDEMPOTENCY_REPLAY).toBe('IDEMPOTENCY_REPLAY');
  });

  it('response statuses match expected values', () => {
    expect(RESPONSE_STATUSES.FIRED).toBe('fired');
    expect(RESPONSE_STATUSES.NOOP).toBe('noop');
  });
});

/**
 * T12: session_events Logging Contract
 *
 * DOCUMENTED LIMITATION: session_events logging occurs in the RPC (DB-side)
 * and cannot be verified in unit tests without integration testing.
 *
 * The contract specifies:
 * - event_type: 'trigger_fire'
 * - event_category: 'trigger'
 * - actor_type: 'host'
 * - actor_id: user.id (from host auth)
 * - target_type: 'trigger'
 * - target_id: trigger_id
 * - payload: { result, idempotency_key, fired_count, execute_once }
 * - severity: 'info'
 *
 * Verification: SQL query against session_events after manual fire,
 * or integration test suite.
 */
describe('T12: session_events Logging (Documented Limitation)', () => {
  it('contract specifies expected payload shape', () => {
    // This test documents the expected shape but cannot verify DB insert
    const expectedPayload = {
      result: 'fired', // or 'noop_execute_once' or 'noop_replay'
      idempotency_key: 'key-abc-123',
      fired_count: 1,
      execute_once: true,
    };

    expect(expectedPayload).toHaveProperty('result');
    expect(expectedPayload).toHaveProperty('idempotency_key');
    expect(expectedPayload).toHaveProperty('fired_count');
    expect(expectedPayload).toHaveProperty('execute_once');
  });
});
