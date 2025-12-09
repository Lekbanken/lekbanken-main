// -----------------------------------------------------------------------------
// Spacing Token Definitions for Sandbox
// -----------------------------------------------------------------------------

export const spacingScales = [
  { base: 2, name: 'Compact', label: 'Compact (2px)' },
  { base: 4, name: 'Default', label: 'Default (4px)' },
  { base: 6, name: 'Relaxed', label: 'Relaxed (6px)' },
  { base: 8, name: 'Spacious', label: 'Spacious (8px)' },
] as const;

export const radiusPresets = [
  { value: 0, name: 'None', label: 'None' },
  { value: 4, name: 'Small', label: 'Small (4px)' },
  { value: 8, name: 'Medium', label: 'Medium (8px)' },
  { value: 12, name: 'Large', label: 'Large (12px)' },
  { value: 16, name: 'XL', label: 'XL (16px)' },
  { value: 9999, name: 'Full', label: 'Full' },
] as const;

export function generateSpacingScale(base: number): Record<string, number> {
  return {
    '0': 0,
    'px': 1,
    '0.5': base * 0.5,
    '1': base,
    '1.5': base * 1.5,
    '2': base * 2,
    '2.5': base * 2.5,
    '3': base * 3,
    '4': base * 4,
    '5': base * 5,
    '6': base * 6,
    '7': base * 7,
    '8': base * 8,
    '9': base * 9,
    '10': base * 10,
    '12': base * 12,
    '14': base * 14,
    '16': base * 16,
    '20': base * 20,
    '24': base * 24,
  };
}
