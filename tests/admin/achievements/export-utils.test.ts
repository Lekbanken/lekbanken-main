/**
 * Tests for badge export utilities
 * Tests building canonical export JSON and extracting badge items
 */

import { describe, it, expect } from 'vitest';
import { 
  buildExportJson, 
  extractBadgeItem, 
  parseCanonicalExportOrThrow,
  readBuilderPayloadOrThrow 
} from '@/features/admin/achievements/export-utils';
import type { AchievementItem } from '@/features/admin/achievements/types';

describe('buildExportJson', () => {
  const mockBadge: AchievementItem = {
    id: 'badge-123',
    title: 'Test Badge',
    subtitle: 'A test badge',
    description: 'This is a test badge for testing',
    rewardCoins: 100,
    status: 'draft',
    version: 1,
    icon: {
      mode: 'theme',
      themeId: 'gold_default',
      size: 'lg',
      base: { id: 'base_circle' },
      symbol: { id: 'ic_star' },
      backgrounds: [],
      foregrounds: []
    }
  };

  const baseArgs = {
    scope: { type: 'tenant' as const, tenantId: '550e8400-e29b-41d4-a716-446655440001' },
    actorUserId: '550e8400-e29b-41d4-a716-446655440000',
    tool: 'test-tool',
    nowIso: '2026-01-08T12:00:00.000Z',
    exportId: 'export-123',
    badge: mockBadge
  };

  it('should build valid canonical export for tenant scope', () => {
    const result = buildExportJson(baseArgs);
    
    expect(result.schema_version).toBe('1.0');
    expect(result.exported_at).toBe('2026-01-08T12:00:00.000Z');
    expect(result.exported_by.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.exported_by.tool).toBe('test-tool');
    expect(result.publish_scope.type).toBe('tenant');
    expect(result.publish_scope.tenant_id).toBe('550e8400-e29b-41d4-a716-446655440001');
  });

  it('should build valid canonical export for global scope', () => {
    const globalArgs = {
      ...baseArgs,
      scope: { type: 'global' as const }
    };
    
    const result = buildExportJson(globalArgs);
    
    expect(result.publish_scope.type).toBe('global');
    expect(result.publish_scope.tenant_id).toBeNull();
  });

  it('should include badge title as achievement name', () => {
    const result = buildExportJson(baseArgs);
    
    expect(result.achievements[0].name).toBe('Test Badge');
  });

  it('should include badge description as achievement description', () => {
    const result = buildExportJson(baseArgs);
    
    expect(result.achievements[0].description).toBe('This is a test badge for testing');
  });

  it('should fall back to subtitle when description is missing', () => {
    const badgeWithoutDescription = {
      ...mockBadge,
      description: undefined
    };
    
    const result = buildExportJson({ ...baseArgs, badge: badgeWithoutDescription });
    
    expect(result.achievements[0].description).toBe('A test badge');
  });

  it('should use exportId as achievement_key', () => {
    const result = buildExportJson(baseArgs);
    
    expect(result.achievements[0].achievement_key).toBe('export-123');
  });

  it('should embed full badge in unlock_criteria.params.builder.badge', () => {
    const result = buildExportJson(baseArgs);
    
    const params = result.achievements[0].unlock.unlock_criteria.params as Record<string, unknown>;
    const builder = params.builder as Record<string, unknown>;
    const embeddedBadge = builder.badge as AchievementItem;
    
    expect(embeddedBadge.id).toBe('badge-123');
    expect(embeddedBadge.title).toBe('Test Badge');
    expect(embeddedBadge.icon.themeId).toBe('gold_default');
  });

  it('should set unlock_criteria type to manual', () => {
    const result = buildExportJson(baseArgs);
    
    expect(result.achievements[0].unlock.unlock_criteria.type).toBe('manual');
  });

  it('should set icon fields to null (placeholder)', () => {
    const result = buildExportJson(baseArgs);
    
    expect(result.achievements[0].icon.icon_media_id).toBeNull();
    expect(result.achievements[0].icon.icon_url_legacy).toBeNull();
  });
});

describe('extractBadgeItem', () => {
  const validExportJson = {
    schema_version: '1.0',
    exported_at: '2026-01-08T12:00:00.000Z',
    exported_by: {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      tool: 'admin-library-badges'
    },
    publish_scope: {
      type: 'tenant',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001'
    },
    achievements: [
      {
        achievement_key: 'export-123',
        name: 'Extracted Badge',
        description: 'A badge to extract',
        icon: {
          icon_media_id: null,
          icon_url_legacy: null
        },
        badge: {
          badge_color: null
        },
        visibility: {
          is_easter_egg: false,
          hint_text: null
        },
        unlock: {
          condition_type: 'manual',
          condition_value: null,
          unlock_criteria: {
            type: 'manual',
            params: {
              builder: {
                badge: {
                  id: 'embedded-badge-id',
                  title: 'Embedded Title',
                  subtitle: 'Embedded Subtitle',
                  rewardCoins: 50,
                  status: 'published',
                  version: 3,
                  icon: {
                    mode: 'theme',
                    themeId: 'silver_default',
                    base: { id: 'base_shield' },
                    symbol: { id: 'ic_flash' }
                  }
                }
              }
            }
          }
        }
      }
    ]
  };

  it('should extract badge with exportId as id', () => {
    const result = extractBadgeItem('my-export-id', validExportJson);
    
    expect(result.id).toBe('my-export-id');
  });

  it('should extract title from embedded badge', () => {
    const result = extractBadgeItem('my-export-id', validExportJson);
    
    expect(result.title).toBe('Embedded Title');
  });

  it('should extract status from embedded badge', () => {
    const result = extractBadgeItem('my-export-id', validExportJson);
    
    expect(result.status).toBe('published');
  });

  it('should default status to draft when missing', () => {
    const exportWithoutStatus = JSON.parse(JSON.stringify(validExportJson));
    delete exportWithoutStatus.achievements[0].unlock.unlock_criteria.params.builder.badge.status;
    
    const result = extractBadgeItem('my-export-id', exportWithoutStatus);
    
    expect(result.status).toBe('draft');
  });

  it('should extract version from embedded badge', () => {
    const result = extractBadgeItem('my-export-id', validExportJson);
    
    expect(result.version).toBe(3);
  });

  it('should default version to 1 when missing', () => {
    const exportWithoutVersion = JSON.parse(JSON.stringify(validExportJson));
    delete exportWithoutVersion.achievements[0].unlock.unlock_criteria.params.builder.badge.version;
    
    const result = extractBadgeItem('my-export-id', exportWithoutVersion);
    
    expect(result.version).toBe(1);
  });

  it('should normalize icon config', () => {
    const result = extractBadgeItem('my-export-id', validExportJson);
    
    expect(result.icon.mode).toBe('theme');
    expect(result.icon.themeId).toBe('silver_default');
    expect(result.icon.base).toEqual({ id: 'base_shield' });
    expect(result.icon.symbol).toEqual({ id: 'ic_flash' });
    expect(result.icon.backgrounds).toEqual([]);
    expect(result.icon.foregrounds).toEqual([]);
  });

  it('should fall back to achievement name when title missing', () => {
    const exportWithoutTitle = JSON.parse(JSON.stringify(validExportJson));
    delete exportWithoutTitle.achievements[0].unlock.unlock_criteria.params.builder.badge.title;
    
    const result = extractBadgeItem('my-export-id', exportWithoutTitle);
    
    expect(result.title).toBe('Extracted Badge');
  });

  it('should throw on invalid schema', () => {
    const invalidExport = { invalid: 'data' };
    
    expect(() => extractBadgeItem('my-export-id', invalidExport)).toThrow();
  });

  it('should throw when builder payload is missing', () => {
    const missingBuilder = JSON.parse(JSON.stringify(validExportJson));
    delete missingBuilder.achievements[0].unlock.unlock_criteria.params.builder;
    
    expect(() => extractBadgeItem('my-export-id', missingBuilder)).toThrow(
      /missing achievements\[0\].unlock.unlock_criteria.params.builder/i
    );
  });
});

describe('parseCanonicalExportOrThrow', () => {
  it('should parse valid export', () => {
    const validExport = {
      schema_version: '1.0',
      exported_at: '2026-01-08T12:00:00.000Z',
      exported_by: {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        tool: 'test'
      },
      publish_scope: {
        type: 'global',
        tenant_id: null
      },
      achievements: [{
        achievement_key: 'test',
        name: 'Test',
        description: 'Test',
        icon: { icon_media_id: null, icon_url_legacy: null },
        badge: { badge_color: null },
        visibility: { is_easter_egg: false, hint_text: null },
        unlock: {
          condition_type: 'manual',
          condition_value: null,
          unlock_criteria: { type: 'manual', params: {} }
        }
      }]
    };
    
    const result = parseCanonicalExportOrThrow(validExport);
    
    expect(result.schema_version).toBe('1.0');
  });

  it('should throw with descriptive error on invalid export', () => {
    const invalidExport = { schema_version: '2.0' };
    
    expect(() => parseCanonicalExportOrThrow(invalidExport)).toThrow(/AWARD_BUILDER_EXPORT_SCHEMA_V1/);
  });
});

describe('readBuilderPayloadOrThrow', () => {
  it('should extract builder payload', () => {
    const exportV1 = {
      schema_version: '1.0' as const,
      exported_at: '2026-01-08T12:00:00.000Z',
      exported_by: { user_id: '550e8400-e29b-41d4-a716-446655440000', tool: 'test' },
      publish_scope: { type: 'global' as const, tenant_id: null },
      achievements: [{
        achievement_key: 'test',
        name: 'Test',
        description: 'Test',
        icon: { icon_media_id: null, icon_url_legacy: null },
        badge: { badge_color: null },
        visibility: { is_easter_egg: false, hint_text: null },
        unlock: {
          condition_type: 'manual',
          condition_value: null,
          unlock_criteria: {
            type: 'manual' as const,
            params: {
              builder: {
                badge: { id: 'test-badge', title: 'Test' }
              }
            }
          }
        }
      }]
    };
    
    const result = readBuilderPayloadOrThrow(exportV1);
    
    expect(result.badge).toEqual({ id: 'test-badge', title: 'Test' });
  });

  it('should throw when params is missing', () => {
    const exportV1 = {
      schema_version: '1.0' as const,
      exported_at: '2026-01-08T12:00:00.000Z',
      exported_by: { user_id: '550e8400-e29b-41d4-a716-446655440000', tool: 'test' },
      publish_scope: { type: 'global' as const, tenant_id: null },
      achievements: [{
        achievement_key: 'test',
        name: 'Test',
        description: 'Test',
        icon: { icon_media_id: null, icon_url_legacy: null },
        badge: { badge_color: null },
        visibility: { is_easter_egg: false, hint_text: null },
        unlock: {
          condition_type: 'manual',
          condition_value: null,
          unlock_criteria: {
            type: 'manual' as const,
            params: {} // No builder
          }
        }
      }]
    };
    
    expect(() => readBuilderPayloadOrThrow(exportV1)).toThrow(/missing.*builder/i);
  });
});

describe('round-trip: build then extract', () => {
  it('should preserve badge data through build/extract cycle', () => {
    const originalBadge: AchievementItem = {
      id: 'original-id',
      title: 'Round Trip Badge',
      subtitle: 'Testing round trip',
      description: 'This badge should survive a round trip',
      rewardCoins: 250,
      status: 'published',
      version: 5,
      category: 'test',
      tags: ['round', 'trip'],
      icon: {
        mode: 'custom',
        themeId: 'emerald',
        size: 'lg',
        base: { id: 'base_hexagon', color: '#FF0000' },
        symbol: { id: 'ic_crown', color: '#FFFFFF' },
        backgrounds: [{ id: 'bg_wings_1', order: 0 }],
        foregrounds: [{ id: 'fg_stars_2', order: 0 }],
        customColors: { base: '#FF0000' }
      },
      profileFrameSync: { enabled: true, durationDays: 7 }
    };

    const exportJson = buildExportJson({
      scope: { type: 'tenant', tenantId: '550e8400-e29b-41d4-a716-446655440001' },
      actorUserId: '550e8400-e29b-41d4-a716-446655440000',
      tool: 'test',
      nowIso: '2026-01-08T12:00:00.000Z',
      exportId: 'round-trip-export',
      badge: originalBadge
    });

    const extractedBadge = extractBadgeItem('round-trip-export', exportJson);

    // ID should be the export ID, not the original badge ID
    expect(extractedBadge.id).toBe('round-trip-export');
    
    // All other fields should be preserved
    expect(extractedBadge.title).toBe('Round Trip Badge');
    expect(extractedBadge.subtitle).toBe('Testing round trip');
    expect(extractedBadge.description).toBe('This badge should survive a round trip');
    expect(extractedBadge.rewardCoins).toBe(250);
    expect(extractedBadge.status).toBe('published');
    expect(extractedBadge.version).toBe(5);
    expect(extractedBadge.category).toBe('test');
    expect(extractedBadge.tags).toEqual(['round', 'trip']);
    
    // Icon should be normalized but preserve data
    expect(extractedBadge.icon.mode).toBe('custom');
    expect(extractedBadge.icon.themeId).toBe('emerald');
    expect(extractedBadge.icon.base).toEqual({ id: 'base_hexagon', color: '#FF0000' });
    expect(extractedBadge.icon.symbol).toEqual({ id: 'ic_crown', color: '#FFFFFF' });
    expect(extractedBadge.icon.backgrounds).toEqual([{ id: 'bg_wings_1', order: 0 }]);
    expect(extractedBadge.icon.foregrounds).toEqual([{ id: 'fg_stars_2', order: 0 }]);
    
    // Profile frame sync should be preserved
    expect(extractedBadge.profileFrameSync).toEqual({ enabled: true, durationDays: 7 });
  });
});
