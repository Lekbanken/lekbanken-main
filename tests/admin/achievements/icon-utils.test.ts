/**
 * Tests for badge icon configuration normalization
 * Ensures backwards compatibility with legacy format and correct normalization
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeIconConfig, 
  getDefaultColor, 
  getEffectiveColor,
  ensureLayerOrder 
} from '@/features/admin/achievements/icon-utils';
import type { AchievementIconConfig, AchievementLayerStackItem } from '@/features/admin/achievements/types';

describe('normalizeIconConfig', () => {
  describe('legacy format migration', () => {
    it('should convert legacy layers.base to base object', () => {
      const legacy = {
        layers: { base: 'base_circle' }
      };
      
      const result = normalizeIconConfig(legacy);
      
      expect(result.base).toEqual({ id: 'base_circle' });
    });

    it('should convert legacy layers.symbol to symbol object', () => {
      const legacy = {
        layers: { symbol: 'ic_star' }
      };
      
      const result = normalizeIconConfig(legacy);
      
      expect(result.symbol).toEqual({ id: 'ic_star' });
    });

    it('should convert legacy layers.background to backgrounds array', () => {
      const legacy = {
        layers: { background: 'bg_wings_1' }
      };
      
      const result = normalizeIconConfig(legacy);
      
      expect(result.backgrounds).toEqual([{ id: 'bg_wings_1' }]);
    });

    it('should convert legacy layers.foreground to foregrounds array', () => {
      const legacy = {
        layers: { foreground: 'fg_crown_1' }
      };
      
      const result = normalizeIconConfig(legacy);
      
      expect(result.foregrounds).toEqual([{ id: 'fg_crown_1' }]);
    });

    it('should handle complete legacy format', () => {
      const legacy = {
        layers: {
          base: 'base_shield',
          background: 'bg_spikes_1',
          foreground: 'fg_stars_2',
          symbol: 'ic_flash'
        }
      };
      
      const result = normalizeIconConfig(legacy);
      
      expect(result.base).toEqual({ id: 'base_shield' });
      expect(result.symbol).toEqual({ id: 'ic_flash' });
      expect(result.backgrounds).toEqual([{ id: 'bg_spikes_1' }]);
      expect(result.foregrounds).toEqual([{ id: 'fg_stars_2' }]);
      // Legacy should be preserved for serialization
      expect(result.layers).toEqual(legacy.layers);
    });
  });

  describe('new format handling', () => {
    it('should prefer new format over legacy when both exist', () => {
      const mixed = {
        base: { id: 'base_hexagon', color: '#FF0000' },
        layers: { base: 'base_circle' } // Should be ignored
      };
      
      const result = normalizeIconConfig(mixed);
      
      expect(result.base).toEqual({ id: 'base_hexagon', color: '#FF0000' });
    });

    it('should preserve multi-layer backgrounds array', () => {
      const icon = {
        backgrounds: [
          { id: 'bg_wings_1', order: 0 },
          { id: 'bg_spikes_2', order: 1 }
        ]
      };
      
      const result = normalizeIconConfig(icon);
      
      expect(result.backgrounds).toHaveLength(2);
      expect(result.backgrounds[0]).toEqual({ id: 'bg_wings_1', order: 0 });
      expect(result.backgrounds[1]).toEqual({ id: 'bg_spikes_2', order: 1 });
    });

    it('should preserve layer colors and opacity', () => {
      const icon = {
        base: { id: 'base_circle', color: '#8661ff', opacity: 0.9 }
      };
      
      const result = normalizeIconConfig(icon);
      
      expect(result.base).toEqual({ id: 'base_circle', color: '#8661ff', opacity: 0.9 });
    });
  });

  describe('defaults', () => {
    it('should return defaults for undefined input', () => {
      const result = normalizeIconConfig(undefined);
      
      expect(result.mode).toBe('theme');
      expect(result.themeId).toBeNull();
      expect(result.size).toBe('lg');
      expect(result.base).toBeNull();
      expect(result.symbol).toBeNull();
      expect(result.backgrounds).toEqual([]);
      expect(result.foregrounds).toEqual([]);
      expect(result.customColors).toEqual({});
    });

    it('should return defaults for empty input', () => {
      const result = normalizeIconConfig({});
      
      expect(result.mode).toBe('theme');
      expect(result.size).toBe('lg');
    });

    it('should preserve mode when specified', () => {
      const result = normalizeIconConfig({ mode: 'custom' });
      
      expect(result.mode).toBe('custom');
    });

    it('should preserve themeId when specified', () => {
      const result = normalizeIconConfig({ themeId: 'gold_default' });
      
      expect(result.themeId).toBe('gold_default');
    });

    it('should preserve size when specified', () => {
      const result = normalizeIconConfig({ size: 'sm' });
      
      expect(result.size).toBe('sm');
    });
  });

  describe('customColors', () => {
    it('should preserve custom colors', () => {
      const icon = {
        customColors: {
          base: '#FF0000',
          symbol: '#00FF00'
        }
      };
      
      const result = normalizeIconConfig(icon);
      
      expect(result.customColors).toEqual({ base: '#FF0000', symbol: '#00FF00' });
    });

    it('should default to empty object when not specified', () => {
      const result = normalizeIconConfig({});
      
      expect(result.customColors).toEqual({});
    });
  });
});

describe('getDefaultColor', () => {
  it('should return correct default for base', () => {
    expect(getDefaultColor('base')).toBe('#8661ff');
  });

  it('should return correct default for background', () => {
    expect(getDefaultColor('background')).toBe('#00c7b0');
  });

  it('should return correct default for foreground', () => {
    expect(getDefaultColor('foreground')).toBe('#ffd166');
  });

  it('should return correct default for symbol', () => {
    expect(getDefaultColor('symbol')).toBe('#ffffff');
  });
});

describe('getEffectiveColor', () => {
  const mockTheme = {
    colors: {
      base: { color: '#THEME_BASE' },
      background: { color: '#THEME_BG' },
      foreground: { color: '#THEME_FG' },
      symbol: { color: '#THEME_SYM' }
    }
  };

  describe('theme mode', () => {
    const themeIcon: AchievementIconConfig = {
      mode: 'theme',
      base: { id: 'base_circle' },
      symbol: { id: 'ic_star' },
      backgrounds: [],
      foregrounds: []
    };

    it('should use theme color when available', () => {
      const result = getEffectiveColor('base', themeIcon, mockTheme);
      
      expect(result).toBe('#THEME_BASE');
    });

    it('should fall back to default when no theme', () => {
      const result = getEffectiveColor('base', themeIcon, undefined);
      
      expect(result).toBe('#8661ff');
    });
  });

  describe('custom mode', () => {
    const customIcon: AchievementIconConfig = {
      mode: 'custom',
      base: { id: 'base_circle' },
      symbol: { id: 'ic_star' },
      backgrounds: [],
      foregrounds: [],
      customColors: {
        base: '#CUSTOM_BASE'
      }
    };

    it('should use item override color first', () => {
      const itemOverride: AchievementLayerStackItem = { id: 'base_circle', color: '#OVERRIDE' };
      
      const result = getEffectiveColor('base', customIcon, mockTheme, itemOverride);
      
      expect(result).toBe('#OVERRIDE');
    });

    it('should use customColors second', () => {
      const result = getEffectiveColor('base', customIcon, mockTheme, null);
      
      expect(result).toBe('#CUSTOM_BASE');
    });

    it('should fall back to theme when no custom color', () => {
      const result = getEffectiveColor('symbol', customIcon, mockTheme, null);
      
      expect(result).toBe('#THEME_SYM');
    });

    it('should fall back to default when no theme or custom', () => {
      const result = getEffectiveColor('symbol', customIcon, undefined, null);
      
      expect(result).toBe('#ffffff');
    });
  });
});

describe('ensureLayerOrder', () => {
  it('should sort items by order property', () => {
    const items: AchievementLayerStackItem[] = [
      { id: 'layer_c', order: 2 },
      { id: 'layer_a', order: 0 },
      { id: 'layer_b', order: 1 }
    ];
    
    const result = ensureLayerOrder(items);
    
    expect(result.map(i => i.id)).toEqual(['layer_a', 'layer_b', 'layer_c']);
  });

  it('should treat undefined order as 0', () => {
    const items: AchievementLayerStackItem[] = [
      { id: 'layer_b', order: 1 },
      { id: 'layer_a' } // No order = 0
    ];
    
    const result = ensureLayerOrder(items);
    
    expect(result.map(i => i.id)).toEqual(['layer_a', 'layer_b']);
  });

  it('should not mutate original array', () => {
    const items: AchievementLayerStackItem[] = [
      { id: 'layer_b', order: 1 },
      { id: 'layer_a', order: 0 }
    ];
    
    const result = ensureLayerOrder(items);
    
    expect(items[0].id).toBe('layer_b'); // Original unchanged
    expect(result[0].id).toBe('layer_a'); // Sorted
  });

  it('should handle empty array', () => {
    const result = ensureLayerOrder([]);
    
    expect(result).toEqual([]);
  });

  it('should handle undefined input', () => {
    const result = ensureLayerOrder(undefined);
    
    expect(result).toEqual([]);
  });
});
