/**
 * ESLint Rule: no-hardcoded-strings
 * 
 * Detects hardcoded Swedish/Norwegian text in JSX that should be internationalized.
 * Part of the i18n migration strategy for Phase 3.
 * 
 * Usage:
 * - "warn" for migration phase (current)
 * - "error" for enforcing after migration complete
 */

'use strict';

// Common Swedish/Norwegian patterns that indicate hardcoded UI text
const NORDIC_PATTERNS = [
  // Swedish patterns
  /\b(och|eller|inte|för|med|att|det|har|kan|ska|som|var|alla|denna|dessa|mitt|vår|era|sina)\b/i,
  // Norwegian patterns  
  /\b(og|eller|ikke|for|med|at|det|har|kan|skal|som|var|alle|denne|disse|mitt|vår|deres|sine)\b/i,
  // Swedish-specific characters
  /[åäö]/i,
  // Norwegian-specific characters
  /[æøå]/i,
  // Common Swedish UI words
  /\b(Visa|Dölj|Laddar|Sparar|Spara|Radera|Ta bort|Lägg till|Skapa|Redigera|Uppdatera|Avbryt|Bekräfta|Stäng|Öppna|Sök|Filtrera|Sortera|Välj|Välkommen|Logga in|Logga ut)\b/i,
  // Common Norwegian UI words
  /\b(Vis|Skjul|Laster|Lagrer|Lagre|Slett|Fjern|Legg til|Opprett|Rediger|Oppdater|Avbryt|Bekreft|Lukk|Åpne|Søk|Filtrer|Sorter|Velg|Velkommen|Logg inn|Logg ut)\b/i,
];

// Strings to always allow (technical/code-related)
const ALLOWED_PATTERNS = [
  // Empty or whitespace
  /^\s*$/,
  // Pure numbers
  /^[\d.,\s%]+$/,
  // Technical identifiers
  /^[a-z_][a-z0-9_]*$/i,
  // URLs and paths
  /^(https?:\/\/|\/|\.|#)/,
  // CSS classes
  /^[a-z][-a-z0-9\s]*$/i,
  // Single characters or symbols
  /^.$/,
  // Known English-only UI patterns
  /^(OK|Cancel|Yes|No|Loading|Error|Success|Warning|Info|Debug|TODO|FIXME|NOTE)$/i,
  // Placeholder text patterns
  /^\{.*\}$/,
  // Icon-only content (emojis, special chars)
  /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u,
];

// Attributes where strings are typically technical/not user-facing
const IGNORED_ATTRIBUTES = [
  'className',
  'class',
  'id',
  'name',
  'type',
  'href',
  'src',
  'alt', // Note: alt should be translated, but handled separately
  'role',
  'aria-labelledby',
  'aria-describedby',
  'data-testid',
  'data-cy',
  'key',
  'ref',
  'style',
];

/**
 * Check if a string contains Nordic language patterns
 */
function containsNordicText(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Check allowed patterns first
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(text)) return false;
  }
  
  // Check for Nordic patterns
  for (const pattern of NORDIC_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  
  return false;
}

/**
 * Get the attribute name if the node is within a JSX attribute
 */
function getParentAttributeName(node) {
  let current = node.parent;
  while (current) {
    if (current.type === 'JSXAttribute' && current.name) {
      return current.name.name;
    }
    current = current.parent;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect hardcoded Nordic language strings that should be internationalized',
      category: 'Best Practices',
      recommended: false,
    },
    messages: {
      hardcodedString: 'Hardcoded text detected: "{{text}}". Consider using useTranslations() or t() for internationalization.',
      hardcodedJsxText: 'Hardcoded JSX text detected. Use {t("key")} instead of literal text.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreAttributes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const ignoreAttrs = new Set([...IGNORED_ATTRIBUTES, ...(options.ignoreAttributes || [])]);

    return {
      // Check JSX text content
      JSXText(node) {
        const text = node.value.trim();
        if (text && containsNordicText(text)) {
          context.report({
            node,
            messageId: 'hardcodedJsxText',
          });
        }
      },

      // Check string literals in JSX expressions
      'JSXExpressionContainer > Literal'(node) {
        if (typeof node.value !== 'string') return;
        
        const attrName = getParentAttributeName(node);
        if (attrName && ignoreAttrs.has(attrName)) return;
        
        if (containsNordicText(node.value)) {
          context.report({
            node,
            messageId: 'hardcodedString',
            data: { text: node.value.slice(0, 50) + (node.value.length > 50 ? '...' : '') },
          });
        }
      },

      // Check JSX attribute string values
      'JSXAttribute > Literal'(node) {
        if (typeof node.value !== 'string') return;
        
        const attrName = node.parent.name?.name;
        if (attrName && ignoreAttrs.has(attrName)) return;
        
        // Check specific attributes that should be translated
        const translatableAttrs = ['title', 'placeholder', 'label', 'aria-label', 'description'];
        if (translatableAttrs.includes(attrName) && containsNordicText(node.value)) {
          context.report({
            node,
            messageId: 'hardcodedString',
            data: { text: node.value.slice(0, 50) + (node.value.length > 50 ? '...' : '') },
          });
        }
      },

      // Check template literals
      'JSXExpressionContainer > TemplateLiteral'(node) {
        const attrName = getParentAttributeName(node);
        if (attrName && ignoreAttrs.has(attrName)) return;
        
        for (const quasi of node.quasis) {
          if (containsNordicText(quasi.value.raw)) {
            context.report({
              node,
              messageId: 'hardcodedString',
              data: { text: quasi.value.raw.slice(0, 50) + (quasi.value.raw.length > 50 ? '...' : '') },
            });
            break;
          }
        }
      },
    };
  },
};
