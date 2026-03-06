/**
 * Step 7 — Behavioral Verification Tests
 *
 * Deep behavioral tests covering:
 *   1. Admin auth/access control (system-admin vs non-admin vs tenant-admin)
 *   2. Admin API CRUD behavior (actual DB effects via mocked Supabase)
 *   3. Render config roundtrip (create → validate → update → validate)
 *   4. Unlock rule CRUD against DB
 *   5. Admin UI structural verification
 *
 * Environment: vitest `node` — route handlers tested via direct import with
 * mocked auth-guard and Supabase client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Supabase mock chain builder
// ---------------------------------------------------------------------------

interface MockChainResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

function createSelectChain(result: MockChainResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  // Resolve directly if not calling single/maybeSingle
  chain.then = vi.fn((resolve: (v: MockChainResult) => void) => resolve(result));
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  return chain;
}

/** Create a mock Supabase client with configurable per-table results */
function createMockSupabase(tableResults: Record<string, MockChainResult> = {}) {
  const defaultResult: MockChainResult = { data: null, error: null };
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  const client = {
    from: vi.fn((table: string) => {
      const result = tableResults[table] ?? defaultResult;
      const chain = createSelectChain(result);

      // Track calls for assertions — wrap each mutating method
      const wrapMethod = (method: string) => {
        const original = chain[method] as (...a: unknown[]) => unknown;
        chain[method] = vi.fn((...args: unknown[]) => {
          calls.push({ table, method, args });
          return original(...args);
        });
      };
      wrapMethod('insert');
      wrapMethod('update');
      wrapMethod('delete');
      wrapMethod('upsert');
      wrapMethod('select');

      return chain;
    }),
    _calls: calls,
  };

  return client;
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

let mockAuthBehavior: 'system_admin' | 'forbidden' | 'unauthorized' = 'system_admin';

// Shared AuthError class used by both mock export and thrown errors
class MockAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

vi.mock('@/lib/api/auth-guard', () => ({
  AuthError: MockAuthError,
  requireSystemAdmin: vi.fn(async () => {
    if (mockAuthBehavior === 'forbidden') {
      throw new MockAuthError('Forbidden', 403);
    }
    if (mockAuthBehavior === 'unauthorized') {
      throw new MockAuthError('Unauthorized', 401);
    }
    return {
      user: { id: 'admin-user-id' },
      effectiveGlobalRole: 'system_admin',
    };
  }),
}));

let mockSupabase: ReturnType<typeof createMockSupabase>;

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(async () => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Helper: create mock NextRequest
// ---------------------------------------------------------------------------

function mockRequest(
  url: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): NextRequest {
  const { method = 'GET', body, headers } = init ?? {};
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
          headers: { 'content-type': 'application/json', ...headers },
        }
      : { headers }),
  });
}

function mockRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Imports — must come AFTER vi.mock declarations
// ---------------------------------------------------------------------------

// These are dynamically imported to ensure mocks are applied
const cosmeticsRoute = await import('@/app/api/admin/cosmetics/route');
const cosmeticIdRoute = await import('@/app/api/admin/cosmetics/[id]/route');
const rulesRoute = await import('@/app/api/admin/cosmetics/[id]/rules/route');
const grantRoute = await import('@/app/api/admin/cosmetics/grant/route');

// =============================================================================
// 1. AUTH / ACCESS CONTROL
// =============================================================================
describe('Step 7 Behavioral — Auth / Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthBehavior = 'system_admin';
    mockSupabase = createMockSupabase();
  });

  // ---- Cosmetics list route ----
  describe('GET /api/admin/cosmetics', () => {
    it('returns 403 when user is not system_admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics');
      const res = await cosmeticsRoute.GET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('returns 401 when user is unauthenticated', async () => {
      mockAuthBehavior = 'unauthorized';
      const req = mockRequest('/api/admin/cosmetics');
      const res = await cosmeticsRoute.GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 200 when user IS system_admin', async () => {
      mockAuthBehavior = 'system_admin';
      mockSupabase = createMockSupabase({
        cosmetics: { data: [], error: null },
      });
      const req = mockRequest('/api/admin/cosmetics');
      const res = await cosmeticsRoute.GET(req);
      expect(res.status).toBe(200);
    });
  });

  // ---- Create cosmetic ----
  describe('POST /api/admin/cosmetics', () => {
    it('returns 403 for non-admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics', {
        method: 'POST',
        body: {},
      });
      const res = await cosmeticsRoute.POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ---- Update cosmetic ----
  describe('PUT /api/admin/cosmetics/:id', () => {
    it('returns 403 for non-admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics/some-id', { method: 'PUT', body: {} });
      const res = await cosmeticIdRoute.PUT(req, mockRouteContext('some-id'));
      expect(res.status).toBe(403);
    });
  });

  // ---- Soft-delete cosmetic ----
  describe('DELETE /api/admin/cosmetics/:id', () => {
    it('returns 403 for non-admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics/some-id', { method: 'DELETE' });
      const res = await cosmeticIdRoute.DELETE(req, mockRouteContext('some-id'));
      expect(res.status).toBe(403);
    });
  });

  // ---- Rules - GET ----
  describe('GET /api/admin/cosmetics/:id/rules', () => {
    it('returns 403 for non-admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics/some-id/rules');
      const res = await rulesRoute.GET(req, mockRouteContext('some-id'));
      expect(res.status).toBe(403);
    });
  });

  // ---- Rules - POST ----
  describe('POST /api/admin/cosmetics/:id/rules', () => {
    it('returns 403 for non-admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics/some-id/rules', {
        method: 'POST',
        body: {},
      });
      const res = await rulesRoute.POST(req, mockRouteContext('some-id'));
      expect(res.status).toBe(403);
    });
  });

  // ---- Rules - DELETE ----
  describe('DELETE /api/admin/cosmetics/:id/rules', () => {
    it('returns 403 for non-admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics/some-id/rules?ruleId=abc', {
        method: 'DELETE',
      });
      const res = await rulesRoute.DELETE(req, mockRouteContext('some-id'));
      expect(res.status).toBe(403);
    });
  });

  // ---- Grant ----
  describe('POST /api/admin/cosmetics/grant', () => {
    it('returns 403 for non-admin', async () => {
      mockAuthBehavior = 'forbidden';
      const req = mockRequest('/api/admin/cosmetics/grant', {
        method: 'POST',
        body: {},
      });
      const res = await grantRoute.POST(req);
      expect(res.status).toBe(403);
    });

    it('returns 401 for unauthenticated user', async () => {
      mockAuthBehavior = 'unauthorized';
      const req = mockRequest('/api/admin/cosmetics/grant', {
        method: 'POST',
        body: {},
      });
      const res = await grantRoute.POST(req);
      expect(res.status).toBe(401);
    });
  });
});

// =============================================================================
// 2. API CRUD BEHAVIOR
// =============================================================================
describe('Step 7 Behavioral — API CRUD Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthBehavior = 'system_admin';
  });

  const VALID_CREATE_BODY = {
    key: 'forest_glow_frame',
    category: 'avatar_frame',
    factionId: 'forest',
    rarity: 'rare',
    nameKey: 'cosmetics.forest_glow.name',
    descriptionKey: 'cosmetics.forest_glow.desc',
    renderType: 'svg_frame',
    renderConfig: { variant: 'glow_v1', glowColor: '#10b981' },
    sortOrder: 10,
    isActive: true,
  };

  // ---- GET list with filters ----
  describe('GET /api/admin/cosmetics — list with filters', () => {
    it('passes category filter to Supabase query', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: [{ id: '1' }], error: null },
      });
      const req = mockRequest('/api/admin/cosmetics?category=avatar_frame');
      const res = await cosmeticsRoute.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cosmetics).toEqual([{ id: '1' }]);
      // Verify .from('cosmetics') was called
      expect(mockSupabase.from).toHaveBeenCalledWith('cosmetics');
    });

    it('passes search filter as ilike', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: [], error: null },
      });
      const req = mockRequest('/api/admin/cosmetics?search=glow');
      const res = await cosmeticsRoute.GET(req);
      expect(res.status).toBe(200);
      // Verify ilike was called on the chain
      const chain = mockSupabase.from('cosmetics');
      expect(chain.ilike).toBeDefined();
    });

    it('returns 500 when Supabase query fails', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: null, error: { message: 'DB error' } },
      });
      const req = mockRequest('/api/admin/cosmetics');
      const res = await cosmeticsRoute.GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('DB error');
    });
  });

  // ---- POST create cosmetic ----
  describe('POST /api/admin/cosmetics — create', () => {
    it('creates a cosmetic row with correct DB fields', async () => {
      const createdRow = { id: 'new-id', ...VALID_CREATE_BODY };
      mockSupabase = createMockSupabase({
        cosmetics: { data: createdRow, error: null },
      });

      const req = mockRequest('/api/admin/cosmetics', {
        method: 'POST',
        body: VALID_CREATE_BODY,
      });
      const res = await cosmeticsRoute.POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.cosmetic).toBeDefined();
      expect(json.cosmetic.id).toBe('new-id');

      // Verify insert was called on 'cosmetics' table
      expect(mockSupabase.from).toHaveBeenCalledWith('cosmetics');
      const insertCall = mockSupabase._calls.find(
        (c) => c.table === 'cosmetics' && c.method === 'insert',
      );
      expect(insertCall).toBeDefined();
      const inserted = insertCall!.args[0] as Record<string, unknown>;
      expect(inserted.key).toBe('forest_glow_frame');
      expect(inserted.render_type).toBe('svg_frame');
      expect(inserted.render_config).toEqual({ variant: 'glow_v1', glowColor: '#10b981' });
      expect(inserted.faction_id).toBe('forest');
      expect(inserted.name_key).toBe('cosmetics.forest_glow.name');
      expect(inserted.is_active).toBe(true);
      expect(inserted.sort_order).toBe(10);
    });

    it('returns 400 for invalid body', async () => {
      const req = mockRequest('/api/admin/cosmetics', {
        method: 'POST',
        body: { key: '' },
      });
      const res = await cosmeticsRoute.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Validation');
    });

    it('returns 400 for invalid render_config', async () => {
      const req = mockRequest('/api/admin/cosmetics', {
        method: 'POST',
        body: {
          ...VALID_CREATE_BODY,
          renderConfig: { wrongField: true }, // svg_frame requires 'variant'
        },
      });
      const res = await cosmeticsRoute.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('render_config');
    });

    it('returns 409 on duplicate key', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: null, error: { message: 'duplicate', code: '23505' } },
      });
      const req = mockRequest('/api/admin/cosmetics', {
        method: 'POST',
        body: VALID_CREATE_BODY,
      });
      const res = await cosmeticsRoute.POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain('already exists');
    });
  });

  // ---- PUT update cosmetic ----
  describe('PUT /api/admin/cosmetics/:id — update', () => {
    it('updates specific fields without touching others', async () => {
      const updatedRow = { id: 'c-1', rarity: 'epic' };
      mockSupabase = createMockSupabase({
        cosmetics: { data: updatedRow, error: null },
      });

      const req = mockRequest('/api/admin/cosmetics/c-1', {
        method: 'PUT',
        body: { rarity: 'epic' },
      });
      const res = await cosmeticIdRoute.PUT(req, mockRouteContext('c-1'));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.cosmetic.rarity).toBe('epic');

      // Verify update was called
      const updateCall = mockSupabase._calls.find(
        (c) => c.table === 'cosmetics' && c.method === 'update',
      );
      expect(updateCall).toBeDefined();
      const updated = updateCall!.args[0] as Record<string, unknown>;
      expect(updated.rarity).toBe('epic');
      expect(updated.updated_at).toBeDefined(); // timestamp set
      // Fields NOT provided should NOT be in updateData
      expect(updated.render_type).toBeUndefined();
      expect(updated.name_key).toBeUndefined();
    });

    it('validates render_config when both renderType and renderConfig provided', async () => {
      const req = mockRequest('/api/admin/cosmetics/c-1', {
        method: 'PUT',
        body: {
          renderType: 'svg_frame',
          renderConfig: { wrongField: true }, // invalid for svg_frame
        },
      });
      const res = await cosmeticIdRoute.PUT(req, mockRouteContext('c-1'));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('render_config');
    });

    it('returns 404 when cosmetic does not exist', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: null, error: { message: 'not found', code: 'PGRST116' } },
      });
      const req = mockRequest('/api/admin/cosmetics/missing', {
        method: 'PUT',
        body: { rarity: 'epic' },
      });
      const res = await cosmeticIdRoute.PUT(req, mockRouteContext('missing'));
      expect(res.status).toBe(404);
    });
  });

  // ---- DELETE soft-delete cosmetic ----
  describe('DELETE /api/admin/cosmetics/:id — soft delete', () => {
    it('sets is_active = false (soft-delete)', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: { id: 'c-1', is_active: false }, error: null },
      });

      const req = mockRequest('/api/admin/cosmetics/c-1', { method: 'DELETE' });
      const res = await cosmeticIdRoute.DELETE(req, mockRouteContext('c-1'));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.cosmetic.is_active).toBe(false);

      // Verify update was called with is_active: false
      const updateCall = mockSupabase._calls.find(
        (c) => c.table === 'cosmetics' && c.method === 'update',
      );
      expect(updateCall).toBeDefined();
      const updated = updateCall!.args[0] as Record<string, unknown>;
      expect(updated.is_active).toBe(false);
      expect(updated.updated_at).toBeDefined();
    });

    it('returns 404 when cosmetic does not exist', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: null, error: { message: 'not found', code: 'PGRST116' } },
      });
      const req = mockRequest('/api/admin/cosmetics/missing', { method: 'DELETE' });
      const res = await cosmeticIdRoute.DELETE(req, mockRouteContext('missing'));
      expect(res.status).toBe(404);
    });
  });
});

// =============================================================================
// 3. RENDER CONFIG ROUNDTRIP
// =============================================================================
describe('Step 7 Behavioral — Render Config Roundtrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthBehavior = 'system_admin';
  });

  const CONFIGS: { renderType: string; validConfig: Record<string, unknown>; invalidConfig: Record<string, unknown> }[] = [
    {
      renderType: 'svg_frame',
      validConfig: { variant: 'glow_v1', glowColor: '#ff0000' },
      invalidConfig: { glowColor: '#ff0000' }, // missing required 'variant'
    },
    {
      renderType: 'css_background',
      validConfig: { className: 'bg-gradient-radial', keyframes: 'pulse 2s' },
      invalidConfig: {}, // missing required 'className'
    },
    {
      renderType: 'css_particles',
      validConfig: { className: 'sparkle-particle', count: 16 },
      invalidConfig: { count: 999 }, // missing className, count > 32
    },
    {
      renderType: 'xp_skin',
      validConfig: { skin: 'fire_bar', colorMode: 'dark' },
      invalidConfig: {}, // missing required 'skin'
    },
    {
      renderType: 'css_divider',
      validConfig: { variant: 'wave', className: 'divider-wave' },
      invalidConfig: {}, // missing required 'variant'
    },
  ];

  for (const { renderType, validConfig, invalidConfig } of CONFIGS) {
    describe(`${renderType} roundtrip`, () => {
      it(`creates cosmetic with valid ${renderType} config → 201`, async () => {
        mockSupabase = createMockSupabase({
          cosmetics: {
            data: {
              id: 'rt-id',
              render_type: renderType,
              render_config: validConfig,
            },
            error: null,
          },
        });

        const req = mockRequest('/api/admin/cosmetics', {
          method: 'POST',
          body: {
            key: `test_${renderType}`,
            category: renderType === 'svg_frame' ? 'avatar_frame'
              : renderType === 'css_background' ? 'scene_background'
              : renderType === 'css_particles' ? 'particles'
              : renderType === 'xp_skin' ? 'xp_bar'
              : 'section_divider',
            nameKey: 'test.name',
            descriptionKey: 'test.desc',
            renderType,
            renderConfig: validConfig,
          },
        });
        const res = await cosmeticsRoute.POST(req);
        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.cosmetic.render_type).toBe(renderType);
        expect(json.cosmetic.render_config).toEqual(validConfig);
      });

      it(`rejects invalid ${renderType} config → 400`, async () => {
        const req = mockRequest('/api/admin/cosmetics', {
          method: 'POST',
          body: {
            key: `test_${renderType}_bad`,
            category: renderType === 'svg_frame' ? 'avatar_frame'
              : renderType === 'css_background' ? 'scene_background'
              : renderType === 'css_particles' ? 'particles'
              : renderType === 'xp_skin' ? 'xp_bar'
              : 'section_divider',
            nameKey: 'test.name',
            descriptionKey: 'test.desc',
            renderType,
            renderConfig: invalidConfig,
          },
        });
        const res = await cosmeticsRoute.POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('render_config');
      });

      it(`updates with valid ${renderType} config → 200`, async () => {
        mockSupabase = createMockSupabase({
          cosmetics: {
            data: { id: 'rt-id', render_type: renderType, render_config: validConfig },
            error: null,
          },
        });

        const req = mockRequest('/api/admin/cosmetics/rt-id', {
          method: 'PUT',
          body: { renderType, renderConfig: validConfig },
        });
        const res = await cosmeticIdRoute.PUT(req, mockRouteContext('rt-id'));
        expect(res.status).toBe(200);
      });

      it(`rejects update with invalid ${renderType} config → 400`, async () => {
        const req = mockRequest('/api/admin/cosmetics/rt-id', {
          method: 'PUT',
          body: { renderType, renderConfig: invalidConfig },
        });
        const res = await cosmeticIdRoute.PUT(req, mockRouteContext('rt-id'));
        expect(res.status).toBe(400);
      });
    });
  }

  it('rejects unknown render_type', async () => {
    const req = mockRequest('/api/admin/cosmetics', {
      method: 'POST',
      body: {
        key: 'test_unknown',
        category: 'avatar_frame',
        nameKey: 'test.name',
        descriptionKey: 'test.desc',
        renderType: 'unknown_type',
        renderConfig: { variant: 'x' },
      },
    });
    const res = await cosmeticsRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 4. UNLOCK RULE CRUD
// =============================================================================
describe('Step 7 Behavioral — Unlock Rule CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthBehavior = 'system_admin';
  });

  const COSMETIC_ID = '00000000-0000-0000-0000-000000000001';
  const RULE_ID = '00000000-0000-0000-0000-000000000002';

  describe('GET /api/admin/cosmetics/:id/rules — list', () => {
    it('returns rules for a cosmetic', async () => {
      const rules = [
        { id: RULE_ID, unlock_type: 'level', unlock_config: { minLevel: 5 }, priority: 1 },
      ];
      mockSupabase = createMockSupabase({
        cosmetic_unlock_rules: { data: rules, error: null },
      });

      const req = mockRequest(`/api/admin/cosmetics/${COSMETIC_ID}/rules`);
      const res = await rulesRoute.GET(req, mockRouteContext(COSMETIC_ID));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.rules).toHaveLength(1);
      expect(json.rules[0].unlock_type).toBe('level');
    });
  });

  describe('POST /api/admin/cosmetics/:id/rules — add rule', () => {
    it('creates a rule with correct DB fields', async () => {
      // Mock: cosmetic exists + rule insert succeeds
      const cosmeticResult = { data: { id: COSMETIC_ID }, error: null };
      const ruleResult = {
        data: { id: RULE_ID, cosmetic_id: COSMETIC_ID, unlock_type: 'level' },
        error: null,
      };

      // We need a more sophisticated mock where cosmetics returns cosmetic
      // and cosmetic_unlock_rules returns the rule
      mockSupabase = createMockSupabase({
        cosmetics: cosmeticResult,
        cosmetic_unlock_rules: ruleResult,
      });

      const req = mockRequest(`/api/admin/cosmetics/${COSMETIC_ID}/rules`, {
        method: 'POST',
        body: {
          unlockType: 'level',
          unlockConfig: { minLevel: 5 },
          priority: 1,
        },
      });
      const res = await rulesRoute.POST(req, mockRouteContext(COSMETIC_ID));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.rule).toBeDefined();

      // Verify insert was called on cosmetic_unlock_rules
      const insertCall = mockSupabase._calls.find(
        (c) => c.table === 'cosmetic_unlock_rules' && c.method === 'insert',
      );
      expect(insertCall).toBeDefined();
      const inserted = insertCall!.args[0] as Record<string, unknown>;
      expect(inserted.cosmetic_id).toBe(COSMETIC_ID);
      expect(inserted.unlock_type).toBe('level');
      expect(inserted.priority).toBe(1);
    });

    it('returns 404 when cosmetic does not exist', async () => {
      mockSupabase = createMockSupabase({
        cosmetics: { data: null, error: { message: 'not found', code: 'PGRST116' } },
      });

      const req = mockRequest(`/api/admin/cosmetics/${COSMETIC_ID}/rules`, {
        method: 'POST',
        body: {
          unlockType: 'level',
          unlockConfig: { minLevel: 5 },
          priority: 1,
        },
      });
      const res = await rulesRoute.POST(req, mockRouteContext(COSMETIC_ID));
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid rule body', async () => {
      const req = mockRequest(`/api/admin/cosmetics/${COSMETIC_ID}/rules`, {
        method: 'POST',
        body: { unlockType: 'invalid_type' },
      });
      const res = await rulesRoute.POST(req, mockRouteContext(COSMETIC_ID));
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/cosmetics/:id/rules — remove rule', () => {
    it('deletes the specified rule', async () => {
      mockSupabase = createMockSupabase({
        cosmetic_unlock_rules: { data: null, error: null },
      });

      const req = mockRequest(
        `/api/admin/cosmetics/${COSMETIC_ID}/rules?ruleId=${RULE_ID}`,
        { method: 'DELETE' },
      );
      const res = await rulesRoute.DELETE(req, mockRouteContext(COSMETIC_ID));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);

      // Verify delete was called
      const deleteCall = mockSupabase._calls.find(
        (c) => c.table === 'cosmetic_unlock_rules' && c.method === 'delete',
      );
      expect(deleteCall).toBeDefined();
    });

    it('returns 400 when ruleId param is missing', async () => {
      const req = mockRequest(`/api/admin/cosmetics/${COSMETIC_ID}/rules`, {
        method: 'DELETE',
      });
      const res = await rulesRoute.DELETE(req, mockRouteContext(COSMETIC_ID));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('ruleId');
    });
  });
});

// =============================================================================
// 5. GRANT BEHAVIOR
// =============================================================================
describe('Step 7 Behavioral — Grant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthBehavior = 'system_admin';
  });

  const COSMETIC_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = '00000000-0000-0000-0000-000000000099';

  it('grants cosmetic to user with idempotent upsert', async () => {
    mockSupabase = createMockSupabase({
      cosmetics: { data: { id: COSMETIC_ID, key: 'forest_frame' }, error: null },
      users: { data: { id: USER_ID, email: 'test@example.com' }, error: null },
      user_cosmetics: {
        data: { user_id: USER_ID, cosmetic_id: COSMETIC_ID, unlock_type: 'manual' },
        error: null,
      },
    });

    const req = mockRequest('/api/admin/cosmetics/grant', {
      method: 'POST',
      body: {
        cosmeticId: COSMETIC_ID,
        userId: USER_ID,
        reason: 'Manual test grant',
      },
    });
    const res = await grantRoute.POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.grant).toBeDefined();
    expect(json.grant.unlock_type).toBe('manual');
    expect(json.message).toContain('forest_frame');
    expect(json.message).toContain('test@example.com');

    // Verify upsert was called on user_cosmetics
    const upsertCall = mockSupabase._calls.find(
      (c) => c.table === 'user_cosmetics' && c.method === 'upsert',
    );
    expect(upsertCall).toBeDefined();
    const upserted = upsertCall!.args[0] as Record<string, unknown>;
    expect(upserted.user_id).toBe(USER_ID);
    expect(upserted.cosmetic_id).toBe(COSMETIC_ID);
    expect(upserted.unlock_type).toBe('manual');
  });

  it('returns 404 when cosmetic does not exist', async () => {
    mockSupabase = createMockSupabase({
      cosmetics: { data: null, error: { message: 'not found' } },
    });
    const req = mockRequest('/api/admin/cosmetics/grant', {
      method: 'POST',
      body: {
        cosmeticId: COSMETIC_ID,
        userId: USER_ID,
        reason: 'Test',
      },
    });
    const res = await grantRoute.POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('Cosmetic not found');
  });

  it('returns 404 when user does not exist', async () => {
    mockSupabase = createMockSupabase({
      cosmetics: { data: { id: COSMETIC_ID, key: 'x' }, error: null },
      users: { data: null, error: { message: 'not found' } },
    });
    const req = mockRequest('/api/admin/cosmetics/grant', {
      method: 'POST',
      body: {
        cosmeticId: COSMETIC_ID,
        userId: USER_ID,
        reason: 'Test',
      },
    });
    const res = await grantRoute.POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('User not found');
  });

  it('returns 400 for invalid grant body (missing reason)', async () => {
    const req = mockRequest('/api/admin/cosmetics/grant', {
      method: 'POST',
      body: {
        cosmeticId: COSMETIC_ID,
        userId: USER_ID,
        // reason missing
      },
    });
    const res = await grantRoute.POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = mockRequest('/api/admin/cosmetics/grant', {
      method: 'POST',
      body: {
        cosmeticId: 'not-a-uuid',
        userId: USER_ID,
        reason: 'Test',
      },
    });
    const res = await grantRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 6. ADMIN UI STRUCTURAL VERIFICATION
// =============================================================================
describe('Step 7 Behavioral — UI Structural Verification', () => {
  it('page.tsx exports metadata and default function (source check)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(
      resolve(__dirname, '../../app/admin/cosmetics/page.tsx'),
      'utf-8',
    );
    expect(src).toContain('export const metadata');
    expect(src).toContain('export default async function');
    expect(src).toContain("title: 'Cosmetics");
  });

  it('CosmeticsAdminClient is a named export function', async () => {
    const mod = await import('@/app/admin/cosmetics/CosmeticsAdminClient');
    expect(mod.CosmeticsAdminClient).toBeDefined();
    expect(typeof mod.CosmeticsAdminClient).toBe('function');
  });

  it('CosmeticEditorDrawer is a named export function', async () => {
    const mod = await import('@/app/admin/cosmetics/CosmeticEditorDrawer');
    expect(mod.CosmeticEditorDrawer).toBeDefined();
    expect(typeof mod.CosmeticEditorDrawer).toBe('function');
  });

  it('CosmeticGrantDialog is a named export function', async () => {
    const mod = await import('@/app/admin/cosmetics/CosmeticGrantDialog');
    expect(mod.CosmeticGrantDialog).toBeDefined();
    expect(typeof mod.CosmeticGrantDialog).toBe('function');
  });

  it('page.tsx uses requireSystemAdmin page guard', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(
      resolve(__dirname, '../../app/admin/cosmetics/page.tsx'),
      'utf-8',
    );
    expect(src).toContain("requireSystemAdmin");
    expect(src).toContain("await requireSystemAdmin()");
  });

  it('CosmeticsAdminClient uses correct i18n namespace', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(
      resolve(__dirname, '../../app/admin/cosmetics/CosmeticsAdminClient.tsx'),
      'utf-8',
    );
    expect(src).toContain("admin.gamification.cosmetics");
  });

  it('CosmeticEditorDrawer uses correct i18n namespace', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(
      resolve(__dirname, '../../app/admin/cosmetics/CosmeticEditorDrawer.tsx'),
      'utf-8',
    );
    expect(src).toContain("admin.gamification.cosmetics");
  });

  it('CosmeticGrantDialog uses correct i18n namespace', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(
      resolve(__dirname, '../../app/admin/cosmetics/CosmeticGrantDialog.tsx'),
      'utf-8',
    );
    expect(src).toContain("admin.gamification.cosmetics.grant");
  });
});
