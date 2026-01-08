/**
 * Tests for award builder export schema validation
 * Ensures canonical JSON format is correctly validated
 */

import { describe, it, expect } from 'vitest';
import { awardBuilderExportSchemaV1, type AwardBuilderExportV1 } from '@/lib/validation/awardBuilderExportSchemaV1';

describe('awardBuilderExportSchemaV1', () => {
  const validExport: AwardBuilderExportV1 = {
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
        achievement_key: 'test-achievement-1',
        name: 'Test Badge',
        description: 'A test badge for testing',
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
                  id: 'test-badge-id',
                  title: 'Test Badge',
                  icon: { mode: 'theme', themeId: 'gold_default' }
                }
              }
            }
          }
        }
      }
    ]
  };

  describe('valid exports', () => {
    it('should accept valid tenant-scoped export', () => {
      const result = awardBuilderExportSchemaV1.safeParse(validExport);
      
      expect(result.success).toBe(true);
    });

    it('should accept valid global-scoped export', () => {
      const globalExport = {
        ...validExport,
        publish_scope: {
          type: 'global' as const,
          tenant_id: null
        }
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(globalExport);
      
      expect(result.success).toBe(true);
    });

    it('should accept export with tool_version', () => {
      const exportWithVersion = {
        ...validExport,
        exported_by: {
          ...validExport.exported_by,
          tool_version: '1.0.0'
        }
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(exportWithVersion);
      
      expect(result.success).toBe(true);
    });

    it('should accept export with multiple achievements', () => {
      const multiAchievement = {
        ...validExport,
        achievements: [
          validExport.achievements[0],
          {
            ...validExport.achievements[0],
            achievement_key: 'test-achievement-2',
            name: 'Second Badge'
          }
        ]
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(multiAchievement);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.achievements).toHaveLength(2);
      }
    });
  });

  describe('schema_version validation', () => {
    it('should reject invalid schema version', () => {
      const invalid = {
        ...validExport,
        schema_version: '2.0'
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });

    it('should reject missing schema version', () => {
      const { schema_version: _schema_version, ...noVersion } = validExport;
      
      const result = awardBuilderExportSchemaV1.safeParse(noVersion);
      
      expect(result.success).toBe(false);
    });
  });

  describe('exported_at validation', () => {
    it('should reject invalid datetime format', () => {
      const invalid = {
        ...validExport,
        exported_at: 'not-a-date'
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });

    it('should reject missing exported_at', () => {
      const { exported_at: _exported_at, ...noDate } = validExport;
      
      const result = awardBuilderExportSchemaV1.safeParse(noDate);
      
      expect(result.success).toBe(false);
    });
  });

  describe('exported_by validation', () => {
    it('should reject invalid user_id format', () => {
      const invalid = {
        ...validExport,
        exported_by: {
          user_id: 'not-a-uuid',
          tool: 'admin'
        }
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });

    it('should reject empty tool name', () => {
      const invalid = {
        ...validExport,
        exported_by: {
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          tool: ''
        }
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });
  });

  describe('publish_scope validation', () => {
    it('should reject global scope with non-null tenant_id', () => {
      const invalid = {
        ...validExport,
        publish_scope: {
          type: 'global' as const,
          tenant_id: '550e8400-e29b-41d4-a716-446655440001' // Should be null
        }
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // Error is in fieldErrors under publish_scope.tenant_id path
        const hasError = result.error.issues.some((issue: { path: (string | number)[]; message: string }) => 
          issue.path.includes('publish_scope') || issue.message.includes('tenant_id')
        );
        expect(hasError).toBe(true);
      }
    });

    it('should reject tenant scope with null tenant_id', () => {
      const invalid = {
        ...validExport,
        publish_scope: {
          type: 'tenant' as const,
          tenant_id: null // Should be a UUID
        }
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid scope type', () => {
      const invalid = {
        ...validExport,
        publish_scope: {
          type: 'invalid',
          tenant_id: null
        }
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });
  });

  describe('achievements validation', () => {
    it('should reject empty achievements array', () => {
      const invalid = {
        ...validExport,
        achievements: []
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });

    it('should reject achievement with empty key', () => {
      const invalid = {
        ...validExport,
        achievements: [{
          ...validExport.achievements[0],
          achievement_key: ''
        }]
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid unlock_criteria type', () => {
      const invalid = {
        ...validExport,
        achievements: [{
          ...validExport.achievements[0],
          unlock: {
            ...validExport.achievements[0].unlock,
            unlock_criteria: {
              type: 'invalid' as const,
              params: {}
            }
          }
        }]
      };
      
      const result = awardBuilderExportSchemaV1.safeParse(invalid);
      
      expect(result.success).toBe(false);
    });

    it('should accept all valid unlock_criteria types', () => {
      const types = ['event', 'milestone', 'manual'] as const;
      
      for (const type of types) {
        const exportWithType = {
          ...validExport,
          achievements: [{
            ...validExport.achievements[0],
            unlock: {
              ...validExport.achievements[0].unlock,
              unlock_criteria: {
                type,
                params: {}
              }
            }
          }]
        };
        
        const result = awardBuilderExportSchemaV1.safeParse(exportWithType);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('type inference', () => {
    it('should correctly infer AwardBuilderExportV1 type', () => {
      const result = awardBuilderExportSchemaV1.parse(validExport);
      
      // TypeScript should be able to access these properties
      expect(result.schema_version).toBe('1.0');
      expect(result.achievements[0].achievement_key).toBe('test-achievement-1');
      expect(result.publish_scope.type).toBe('tenant');
    });
  });
});
