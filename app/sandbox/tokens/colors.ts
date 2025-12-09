// -----------------------------------------------------------------------------
// Color Token Definitions for Sandbox
// -----------------------------------------------------------------------------

export const accentPresets = [
  { hue: 262, name: 'Purple (Lekbanken)' },
  { hue: 220, name: 'Blue' },
  { hue: 160, name: 'Teal' },
  { hue: 142, name: 'Green' },
  { hue: 25, name: 'Orange' },
  { hue: 0, name: 'Red' },
  { hue: 330, name: 'Pink' },
] as const;

export const surfaceShades = [
  { id: 'white', label: 'White', light: '#ffffff', dark: '#18181b' },
  { id: 'zinc-50', label: 'Zinc 50', light: '#fafafa', dark: '#27272a' },
  { id: 'zinc-100', label: 'Zinc 100', light: '#f4f4f5', dark: '#3f3f46' },
  { id: 'zinc-900', label: 'Zinc 900', light: '#18181b', dark: '#fafafa' },
  { id: 'zinc-950', label: 'Zinc 950', light: '#09090b', dark: '#ffffff' },
] as const;

export function hslAccent(hue: number, saturation = 65, lightness = 55): string {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function generateAccentPalette(hue: number) {
  return {
    50: `hsl(${hue}, 100%, 97%)`,
    100: `hsl(${hue}, 95%, 93%)`,
    200: `hsl(${hue}, 90%, 85%)`,
    300: `hsl(${hue}, 85%, 75%)`,
    400: `hsl(${hue}, 80%, 65%)`,
    500: `hsl(${hue}, 75%, 55%)`,
    600: `hsl(${hue}, 70%, 45%)`,
    700: `hsl(${hue}, 65%, 38%)`,
    800: `hsl(${hue}, 60%, 30%)`,
    900: `hsl(${hue}, 55%, 22%)`,
    950: `hsl(${hue}, 50%, 12%)`,
  };
}
