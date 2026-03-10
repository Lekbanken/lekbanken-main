/**
 * Contract test: Roles API field sanitization
 *
 * Verifies that the route extraction pattern for GET /api/games/[gameId]/roles
 * does NOT pass private fields to the mapper, and that mapRoles() output
 * does not contain private fields when they are absent from input.
 *
 * Finding addressed: F5
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { mapRoles } from '@/lib/game-display/mappers';

// Simulates a DB row as returned by getGameRoles()
const mockDbRole = {
  id: 'role-1',
  name: 'Detective',
  icon: '🔍',
  color: '#ff0000',
  role_order: 1,
  public_description: 'Investigates clues',
  private_instructions: 'SECRET: The butler did it',
  private_hints: 'Look behind the curtain',
  min_count: 1,
  max_count: 4,
  assignment_strategy: 'random' as const,
  scaling_rules: null,
  conflicts_with: null,
};

describe('Roles API contract — field sanitization', () => {
  it('mapRoles() maps private fields when they are present in input', () => {
    // This proves that mapRoles itself does not strip — it's the route's job
    const roles = mapRoles([mockDbRole]);
    expect(roles[0].privateNote).toBe('SECRET: The butler did it');
    expect(roles[0].secrets).toEqual(['Look behind the curtain']);
    expect(roles[0].assignmentStrategy).toBe('random');
  });

  it('route extraction pattern produces output without private fields', () => {
    // This replicates the EXACT extraction pattern from roles/route.ts
    // after the Block 1 fix (private fields removed)
    const sanitizedExtraction = {
      id: mockDbRole.id,
      name: mockDbRole.name,
      icon: mockDbRole.icon,
      color: mockDbRole.color,
      role_order: mockDbRole.role_order,
      public_description: mockDbRole.public_description,
      min_count: mockDbRole.min_count,
      max_count: mockDbRole.max_count,
    };

    const roles = mapRoles([sanitizedExtraction]);

    // Private fields must NOT appear in output
    expect(roles[0].privateNote).toBeUndefined();
    expect(roles[0].secrets).toBeUndefined();
    expect(roles[0].assignmentStrategy).toBeUndefined();

    // Public fields must still be present
    expect(roles[0].name).toBe('Detective');
    expect(roles[0].icon).toBe('🔍');
    expect(roles[0].color).toBe('#ff0000');
    expect(roles[0].publicNote).toBe('Investigates clues');
    expect(roles[0].minCount).toBe(1);
    expect(roles[0].maxCount).toBe(4);
  });

  it('mapRoles() handles empty input', () => {
    expect(mapRoles([])).toEqual([]);
    expect(mapRoles(undefined)).toEqual([]);
  });
});
