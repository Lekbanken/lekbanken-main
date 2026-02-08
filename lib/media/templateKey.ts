/**
 * Template Key Generation for Standardbilder
 * 
 * Generates deterministic, collision-safe template keys for media_templates.
 * 
 * Key format:
 * - Global (no product): `std_{purposeSlug}_{n}`
 * - Product-specific: `std_{productSlug}_{purposeSlug}_{n}`
 * 
 * Where `n` is the smallest available positive integer for that combo.
 * 
 * @module lib/media/templateKey
 */

/**
 * Converts a string to a URL-safe slug.
 * - Lowercases
 * - Replaces Swedish characters (åäö→a, ao)
 * - Removes diacritics
 * - Replaces spaces/special chars with dashes
 * - Removes consecutive dashes
 * - Trims leading/trailing dashes
 */
export function slugify(input: string): string {
  if (!input) return '';
  
  let result = input.toLowerCase().trim();
  
  // Swedish character replacements
  const charMap: Record<string, string> = {
    'å': 'a',
    'ä': 'a',
    'ö': 'o',
    'é': 'e',
    'è': 'e',
    'ê': 'e',
    'ë': 'e',
    'à': 'a',
    'â': 'a',
    'ù': 'u',
    'û': 'u',
    'ü': 'u',
    'ï': 'i',
    'î': 'i',
    'ô': 'o',
    'ç': 'c',
    'ñ': 'n',
    'ß': 'ss',
    'æ': 'ae',
    'ø': 'o',
  };
  
  // Replace known characters
  for (const [char, replacement] of Object.entries(charMap)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  
  // Remove any remaining diacritics via NFD normalization
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace ampersand with 'och' (Swedish 'and')
  result = result.replace(/&/g, '-och-');
  
  // Replace spaces and special characters with dashes
  result = result.replace(/[^a-z0-9]+/g, '-');
  
  // Remove consecutive dashes
  result = result.replace(/-+/g, '-');
  
  // Trim leading/trailing dashes
  result = result.replace(/^-+|-+$/g, '');
  
  return result;
}

export interface GenerateTemplateKeyParams {
  productId: string | null;
  productName: string | null;
  purposeId: string;
  purposeName: string;
  existingTemplateKeys: string[];
}

export interface GenerateTemplateKeyResult {
  templateKey: string;
  suggestedName: string;
  slotNumber: number;
}

/**
 * Generates a unique template key for a product + purpose combination.
 * 
 * Finds the smallest available slot number (1, 2, 3...) that doesn't
 * create a collision with existing keys for this combo.
 */
export function generateTemplateKey(params: GenerateTemplateKeyParams): GenerateTemplateKeyResult {
  const { productId, productName, purposeName, existingTemplateKeys = [] } = params;
  
  const purposeSlug = slugify(purposeName);
  const productSlug = productId && productName ? slugify(productName) : null;
  
  // Determine base pattern
  const basePattern = productSlug
    ? `std_${productSlug}_${purposeSlug}_`
    : `std_${purposeSlug}_`;
  
  // Find used slot numbers by parsing existing keys that match our pattern
  const usedSlots = new Set<number>();
  
  for (const key of existingTemplateKeys) {
    if (key.startsWith(basePattern)) {
      const suffix = key.slice(basePattern.length);
      const slotNum = parseInt(suffix, 10);
      if (!isNaN(slotNum) && slotNum > 0) {
        usedSlots.add(slotNum);
      }
    }
  }
  
  // Find smallest available slot (1-indexed)
  let slotNumber = 1;
  while (usedSlots.has(slotNumber)) {
    slotNumber++;
  }
  
  const templateKey = `${basePattern}${slotNumber}`;
  
  // Generate suggested name
  const suggestedName = productName
    ? `${purposeName} – ${productName} ${slotNumber}`
    : `${purposeName} ${slotNumber}`;
  
  return {
    templateKey,
    suggestedName,
    slotNumber,
  };
}

/**
 * Maximum number of templates allowed per product + purpose combination.
 * This is a soft limit enforced in UI and backend validation.
 */
export const MAX_TEMPLATES_PER_COMBO = 5;

/**
 * Checks if a new template can be created for a given combo.
 */
export function canCreateTemplate(existingCount: number): boolean {
  return existingCount < MAX_TEMPLATES_PER_COMBO;
}

/**
 * Parses a template key to extract its components.
 * Returns null if the key doesn't match the expected format.
 */
export function parseTemplateKey(key: string): { productSlug: string | null; purposeSlug: string; slotNumber: number } | null {
  if (!key.startsWith('std_')) return null;
  
  const parts = key.slice(4).split('_'); // Remove 'std_' prefix
  
  if (parts.length === 2) {
    // Global format: std_{purposeSlug}_{n}
    const slotNumber = parseInt(parts[1], 10);
    if (isNaN(slotNumber)) return null;
    return { productSlug: null, purposeSlug: parts[0], slotNumber };
  } else if (parts.length === 3) {
    // Product format: std_{productSlug}_{purposeSlug}_{n}
    const slotNumber = parseInt(parts[2], 10);
    if (isNaN(slotNumber)) return null;
    return { productSlug: parts[0], purposeSlug: parts[1], slotNumber };
  }
  
  return null;
}
