/**
 * Contract test: Artifacts API field sanitization
 *
 * Verifies the route-level filtering pattern for GET /api/games/[gameId]/artifacts:
 * 1. Non-public variants (leader_only, role_private) are filtered out before mapping
 * 2. metadata.correctCode is stripped before mapping
 * 3. Artifacts with zero remaining public variants still survive (empty variants array)
 *
 * Findings addressed: F8, F8b
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { mapArtifacts } from '@/lib/game-display/mappers';

// Simulates the route-level filtering: variants filtered + correctCode stripped
function applyRouteFiltering(dbArtifacts: Array<Record<string, unknown>>) {
  return dbArtifacts.map((a) => {
    const { correctCode: _correctCode, ...safeMetadata } = (a.metadata as Record<string, unknown>) ?? {};
    return {
      ...a,
      metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : null,
      variants: (a.variants as Array<Record<string, unknown>>)?.filter(
        (v) => v.visibility === 'public'
      ),
    };
  });
}

describe('Artifacts API contract (F8 + F8b)', () => {
  it('filters non-public variants, returns only public', () => {
    const dbArtifacts = [
      {
        id: 'a1',
        title: 'Mixed Artifact',
        artifact_type: 'card',
        artifact_order: 1,
        tags: [],
        metadata: null,
        variants: [
          { id: 'v1', title: 'Public Card', body: 'Visible', visibility: 'public', variant_order: 1, visible_to_role_id: null, media_ref: null },
          { id: 'v2', title: 'Leader Hint', body: 'Secret hint', visibility: 'leader_only', variant_order: 2, visible_to_role_id: null, media_ref: null },
          { id: 'v3', title: 'Role Secret', body: 'Your mission...', visibility: 'role_private', variant_order: 3, visible_to_role_id: 'role-1', media_ref: null },
        ],
      },
    ];

    const filtered = applyRouteFiltering(dbArtifacts);
    const result = mapArtifacts(filtered as Parameters<typeof mapArtifacts>[0]);

    expect(result).toHaveLength(1);
    expect(result[0].variants).toHaveLength(1);
    expect(result[0].variants![0].title).toBe('Public Card');
    expect(result[0].variants![0].visibility).toBe('public');
  });

  it('returns artifact with empty variants when all variants are non-public', () => {
    const dbArtifacts = [
      {
        id: 'a1',
        title: 'Leader-Only Artifact',
        artifact_type: 'document',
        artifact_order: 1,
        tags: [],
        metadata: null,
        variants: [
          { id: 'v1', title: 'Secret Doc', body: 'Leader eyes only', visibility: 'leader_only', variant_order: 1, visible_to_role_id: null, media_ref: null },
        ],
      },
    ];

    const filtered = applyRouteFiltering(dbArtifacts);
    const result = mapArtifacts(filtered as Parameters<typeof mapArtifacts>[0]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Leader-Only Artifact');
    expect(result[0].variants).toHaveLength(0);
  });

  it('handles artifact with no variants (undefined)', () => {
    const dbArtifacts = [
      {
        id: 'a1',
        title: 'No Variants',
        artifact_type: 'prop',
        artifact_order: 1,
        tags: [],
        metadata: null,
      },
    ];

    const filtered = applyRouteFiltering(dbArtifacts);
    const result = mapArtifacts(filtered as Parameters<typeof mapArtifacts>[0]);

    expect(result).toHaveLength(1);
    expect(result[0].variants).toBeUndefined();
  });

  it('strips metadata.correctCode from keypad artifacts (F8b)', () => {
    const dbArtifacts = [
      {
        id: 'a1',
        title: 'Keypad Lock',
        artifact_type: 'keypad',
        artifact_order: 1,
        tags: [],
        metadata: {
          correctCode: '1234',
          codeLength: 4,
          maxAttempts: 3,
          successMessage: 'Unlocked!',
        },
        variants: [
          { id: 'v1', title: 'Public Hint', body: 'Try the year', visibility: 'public', variant_order: 1, visible_to_role_id: null, media_ref: null },
        ],
      },
    ];

    const filtered = applyRouteFiltering(dbArtifacts);
    const result = mapArtifacts(filtered as Parameters<typeof mapArtifacts>[0]);

    expect(result[0].metadata).toBeDefined();
    expect(result[0].metadata).not.toHaveProperty('correctCode');
    expect(result[0].metadata).toHaveProperty('codeLength', 4);
    expect(result[0].metadata).toHaveProperty('maxAttempts', 3);
    expect(result[0].metadata).toHaveProperty('successMessage', 'Unlocked!');
  });

  it('nullifies metadata when correctCode is the only field', () => {
    const dbArtifacts = [
      {
        id: 'a1',
        title: 'Bare Keypad',
        artifact_type: 'keypad',
        artifact_order: 1,
        tags: [],
        metadata: { correctCode: '0042' },
        variants: [],
      },
    ];

    const filtered = applyRouteFiltering(dbArtifacts);
    const result = mapArtifacts(filtered as Parameters<typeof mapArtifacts>[0]);

    expect(result[0].metadata).toBeUndefined();
  });
});
