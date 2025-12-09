// -----------------------------------------------------------------------------
// Font Definitions for Sandbox
// -----------------------------------------------------------------------------

export const fontFamilies = [
  { id: 'inter', name: 'Inter', value: 'Inter, system-ui, sans-serif', category: 'sans-serif' },
  { id: 'roboto', name: 'Roboto', value: 'Roboto, system-ui, sans-serif', category: 'sans-serif' },
  { id: 'poppins', name: 'Poppins', value: 'Poppins, system-ui, sans-serif', category: 'sans-serif' },
  { id: 'nunito', name: 'Nunito', value: 'Nunito, system-ui, sans-serif', category: 'sans-serif' },
  { id: 'open-sans', name: 'Open Sans', value: '"Open Sans", system-ui, sans-serif', category: 'sans-serif' },
  { id: 'lato', name: 'Lato', value: 'Lato, system-ui, sans-serif', category: 'sans-serif' },
  { id: 'montserrat', name: 'Montserrat', value: 'Montserrat, system-ui, sans-serif', category: 'sans-serif' },
  { id: 'source-sans', name: 'Source Sans 3', value: '"Source Sans 3", system-ui, sans-serif', category: 'sans-serif' },
  { id: 'merriweather', name: 'Merriweather', value: 'Merriweather, Georgia, serif', category: 'serif' },
  { id: 'playfair', name: 'Playfair Display', value: '"Playfair Display", Georgia, serif', category: 'serif' },
  { id: 'lora', name: 'Lora', value: 'Lora, Georgia, serif', category: 'serif' },
  { id: 'georgia', name: 'Georgia', value: 'Georgia, serif', category: 'serif' },
  { id: 'fira-code', name: 'Fira Code', value: '"Fira Code", monospace', category: 'mono' },
  { id: 'jetbrains', name: 'JetBrains Mono', value: '"JetBrains Mono", monospace', category: 'mono' },
] as const;

export const fontWeights = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extrabold' },
] as const;

export const typeScales = [
  { value: 1.067, label: 'Minor Second (1.067)' },
  { value: 1.125, label: 'Major Second (1.125)' },
  { value: 1.2, label: 'Minor Third (1.2)' },
  { value: 1.25, label: 'Major Third (1.25)' },
  { value: 1.333, label: 'Perfect Fourth (1.333)' },
  { value: 1.414, label: 'Augmented Fourth (1.414)' },
  { value: 1.5, label: 'Perfect Fifth (1.5)' },
  { value: 1.618, label: 'Golden Ratio (1.618)' },
] as const;

export function getFontFamily(id: string): string {
  return fontFamilies.find((f) => f.id === id)?.value ?? fontFamilies[0].value;
}

export function calculateTypeScale(baseSize: number, ratio: number, step: number): number {
  return Math.round(baseSize * Math.pow(ratio, step) * 100) / 100;
}
