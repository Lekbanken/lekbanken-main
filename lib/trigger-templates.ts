/**
 * Trigger Template Library
 * 
 * Pre-built trigger templates for common automation patterns.
 * Makes it easy to add triggers without deep knowledge of the system.
 * 
 * Backlog B.6: Trigger template library
 */

import type { TriggerCondition, TriggerAction } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

export interface TriggerTemplate {
  /** Unique template ID */
  id: string;
  /** Display name */
  name: string;
  /** Description of what the trigger does */
  description: string;
  /** Category for grouping */
  category: TriggerTemplateCategory;
  /** Difficulty/complexity level */
  complexity: 'beginner' | 'intermediate' | 'advanced';
  /** Icon identifier */
  icon: string;
  /** Tags for searching */
  tags: string[];
  /** The condition (with placeholders) */
  when: TriggerConditionTemplate;
  /** The actions (with placeholders) */
  then: TriggerActionTemplate[];
  /** Whether trigger should execute only once */
  executeOnce?: boolean;
  /** Default delay in seconds */
  delaySeconds?: number;
  /** Variables that need to be filled in */
  variables: TriggerTemplateVariable[];
  /** Example use cases */
  examples?: string[];
}

export interface TriggerConditionTemplate {
  type: TriggerCondition['type'];
  /** Placeholder values like {{stepId}}, {{keypadId}} */
  [key: string]: unknown;
}

export interface TriggerActionTemplate {
  type: TriggerAction['type'];
  /** Placeholder values */
  [key: string]: unknown;
}

export interface TriggerTemplateVariable {
  /** Variable name (e.g., 'stepId', 'message') */
  name: string;
  /** Display label */
  label: string;
  /** Variable type */
  type: 'step' | 'phase' | 'artifact' | 'string' | 'number' | 'duration' | 'channel';
  /** Description */
  description?: string;
  /** Whether required */
  required: boolean;
  /** Default value */
  defaultValue?: unknown;
}

export type TriggerTemplateCategory =
  | 'navigation'     // Step/phase progression
  | 'puzzle'         // Puzzle completions
  | 'reveal'         // Showing/hiding content
  | 'timing'         // Time-based triggers
  | 'feedback'       // Player feedback
  | 'advanced';      // Complex multi-action

// =============================================================================
// Category Labels & Icons
// =============================================================================

export const TEMPLATE_CATEGORY_LABELS: Record<TriggerTemplateCategory, string> = {
  navigation: 'Navigation',
  puzzle: 'Pussel & Gåtor',
  reveal: 'Visa & Dölj',
  timing: 'Tid & Timer',
  feedback: 'Feedback',
  advanced: 'Avancerat',
};

export const TEMPLATE_CATEGORY_ICONS: Record<TriggerTemplateCategory, string> = {
  navigation: '🧭',
  puzzle: '🧩',
  reveal: '👁️',
  timing: '⏱️',
  feedback: '💬',
  advanced: '⚡',
};

// =============================================================================
// Template Library
// =============================================================================

export const TRIGGER_TEMPLATES: TriggerTemplate[] = [
  // ===========================================================================
  // Navigation Templates
  // ===========================================================================
  {
    id: 'step-complete-advance',
    name: 'Automatiskt nästa steg',
    description: 'Gå automatiskt till nästa steg när detta steg markeras som klart',
    category: 'navigation',
    complexity: 'beginner',
    icon: 'arrow-right',
    tags: ['steg', 'progression', 'automatisk'],
    when: {
      type: 'step_completed',
      stepId: '{{stepId}}',
    },
    then: [
      { type: 'advance_step' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'stepId',
        label: 'Steg',
        type: 'step',
        description: 'Steget som ska trigga progression',
        required: true,
      },
    ],
    examples: [
      'Gå till nästa steg när introduktionen är klar',
      'Automatisk progression efter instruktionssteget',
    ],
  },
  {
    id: 'phase-complete-advance',
    name: 'Automatiskt nästa fas',
    description: 'Gå till nästa fas när denna fas är klar',
    category: 'navigation',
    complexity: 'beginner',
    icon: 'layers',
    tags: ['fas', 'progression'],
    when: {
      type: 'phase_completed',
      phaseId: '{{phaseId}}',
    },
    then: [
      { type: 'advance_phase' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'phaseId',
        label: 'Fas',
        type: 'phase',
        required: true,
      },
    ],
  },

  // ===========================================================================
  // Puzzle Templates
  // ===========================================================================
  {
    id: 'keypad-correct-reveal',
    name: 'Visa ledtråd vid rätt kod',
    description: 'Visar en gömd artefakt när korrekt kod matas in',
    category: 'puzzle',
    complexity: 'beginner',
    icon: 'key',
    tags: ['keypad', 'kod', 'reveal', 'ledtråd'],
    when: {
      type: 'keypad_correct',
      keypadId: '{{keypadId}}',
    },
    then: [
      { type: 'reveal_artifact', artifactId: '{{artifactId}}' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'keypadId',
        label: 'Keypad',
        type: 'artifact',
        required: true,
      },
      {
        name: 'artifactId',
        label: 'Artefakt att visa',
        type: 'artifact',
        required: true,
      },
    ],
    examples: [
      'Visa hemlig karta när kassaskåpskoden är rätt',
      'Lås upp dagboken med rätt kod',
    ],
  },
  {
    id: 'keypad-correct-advance',
    name: 'Nästa steg vid rätt kod',
    description: 'Går till nästa steg när korrekt kod matas in',
    category: 'puzzle',
    complexity: 'beginner',
    icon: 'key',
    tags: ['keypad', 'kod', 'steg'],
    when: {
      type: 'keypad_correct',
      keypadId: '{{keypadId}}',
    },
    then: [
      { type: 'advance_step' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'keypadId',
        label: 'Keypad',
        type: 'artifact',
        required: true,
      },
    ],
  },
  {
    id: 'riddle-correct-reveal',
    name: 'Visa svar vid löst gåta',
    description: 'Visar en artefakt när gåtan löses korrekt',
    category: 'puzzle',
    complexity: 'beginner',
    icon: 'help-circle',
    tags: ['gåta', 'riddle', 'svar'],
    when: {
      type: 'riddle_correct',
      riddleId: '{{riddleId}}',
    },
    then: [
      { type: 'reveal_artifact', artifactId: '{{artifactId}}' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'riddleId',
        label: 'Gåta',
        type: 'artifact',
        required: true,
      },
      {
        name: 'artifactId',
        label: 'Artefakt att visa',
        type: 'artifact',
        required: true,
      },
    ],
  },
  {
    id: 'puzzle-complete-countdown',
    name: 'Nedräkning efter pussel',
    description: 'Startar en nedräkning när pusslet är löst',
    category: 'puzzle',
    complexity: 'intermediate',
    icon: 'puzzle',
    tags: ['pussel', 'nedräkning', 'timer'],
    when: {
      type: 'tile_puzzle_complete',
      tilePuzzleId: '{{puzzleId}}',
    },
    then: [
      { type: 'show_countdown', duration: '{{duration}}', message: '{{message}}' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'puzzleId',
        label: 'Pussel',
        type: 'artifact',
        required: true,
      },
      {
        name: 'duration',
        label: 'Tid (sekunder)',
        type: 'number',
        defaultValue: 60,
        required: true,
      },
      {
        name: 'message',
        label: 'Nedräkningsmeddelande',
        type: 'string',
        defaultValue: 'Tid kvar',
        required: false,
      },
    ],
  },

  // ===========================================================================
  // Reveal Templates
  // ===========================================================================
  {
    id: 'step-start-reveal',
    name: 'Visa vid stegstart',
    description: 'Visar en artefakt när ett visst steg startar',
    category: 'reveal',
    complexity: 'beginner',
    icon: 'eye',
    tags: ['visa', 'steg', 'reveal'],
    when: {
      type: 'step_started',
      stepId: '{{stepId}}',
    },
    then: [
      { type: 'reveal_artifact', artifactId: '{{artifactId}}' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'stepId',
        label: 'Steg',
        type: 'step',
        required: true,
      },
      {
        name: 'artifactId',
        label: 'Artefakt att visa',
        type: 'artifact',
        required: true,
      },
    ],
  },
  {
    id: 'step-start-hide',
    name: 'Dölj vid stegstart',
    description: 'Döljer en artefakt när ett visst steg startar',
    category: 'reveal',
    complexity: 'beginner',
    icon: 'eye-off',
    tags: ['dölj', 'steg', 'hide'],
    when: {
      type: 'step_started',
      stepId: '{{stepId}}',
    },
    then: [
      { type: 'hide_artifact', artifactId: '{{artifactId}}' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'stepId',
        label: 'Steg',
        type: 'step',
        required: true,
      },
      {
        name: 'artifactId',
        label: 'Artefakt att dölja',
        type: 'artifact',
        required: true,
      },
    ],
  },
  {
    id: 'reveal-chain',
    name: 'Kedjereaktion (visa flera)',
    description: 'Visar flera artefakter i följd efter en händelse',
    category: 'reveal',
    complexity: 'intermediate',
    icon: 'link',
    tags: ['kedja', 'flera', 'reveal'],
    when: {
      type: 'artifact_unlocked',
      artifactId: '{{triggerArtifactId}}',
    },
    then: [
      { type: 'reveal_artifact', artifactId: '{{artifact1Id}}' },
      { type: 'reveal_artifact', artifactId: '{{artifact2Id}}' },
    ],
    delaySeconds: 1,
    executeOnce: true,
    variables: [
      {
        name: 'triggerArtifactId',
        label: 'Triggande artefakt',
        type: 'artifact',
        required: true,
      },
      {
        name: 'artifact1Id',
        label: 'Artefakt 1 att visa',
        type: 'artifact',
        required: true,
      },
      {
        name: 'artifact2Id',
        label: 'Artefakt 2 att visa',
        type: 'artifact',
        required: true,
      },
    ],
  },

  // ===========================================================================
  // Timing Templates
  // ===========================================================================
  {
    id: 'timebank-expired-end',
    name: 'Avsluta vid tidsslut',
    description: 'Går till avslutningssteg när tidsbanken tar slut',
    category: 'timing',
    complexity: 'beginner',
    icon: 'clock',
    tags: ['tid', 'tidsbank', 'slut'],
    when: {
      type: 'time_bank_expired',
    },
    then: [
      { type: 'advance_step' },
      { type: 'send_message', message: '{{message}}', channel: 'all' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'message',
        label: 'Meddelande',
        type: 'string',
        defaultValue: 'Tiden är slut!',
        required: false,
      },
    ],
  },
  {
    id: 'countdown-show',
    name: 'Visa nedräkning vid start',
    description: 'Visar en nedräkning när steget startar',
    category: 'timing',
    complexity: 'beginner',
    icon: 'timer',
    tags: ['nedräkning', 'timer', 'start'],
    when: {
      type: 'step_started',
      stepId: '{{stepId}}',
    },
    then: [
      { type: 'show_countdown', duration: '{{duration}}', message: '{{message}}' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'stepId',
        label: 'Steg',
        type: 'step',
        required: true,
      },
      {
        name: 'duration',
        label: 'Tid (sekunder)',
        type: 'number',
        defaultValue: 300,
        required: true,
      },
      {
        name: 'message',
        label: 'Meddelande',
        type: 'string',
        defaultValue: 'Tid kvar',
        required: false,
      },
    ],
  },
  {
    id: 'timer-expired-reveal',
    name: 'Visa ledtråd efter timer',
    description: 'Visar automatiskt en ledtråd när en timer går ut',
    category: 'timing',
    complexity: 'intermediate',
    icon: 'bell',
    tags: ['timer', 'ledtråd', 'automatisk'],
    when: {
      type: 'timer_ended',
      timerId: '{{timerId}}',
    },
    then: [
      { type: 'reveal_artifact', artifactId: '{{hintArtifactId}}' },
      { type: 'send_message', message: 'Här är en ledtråd!', channel: 'all' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'timerId',
        label: 'Timer-ID',
        type: 'string',
        required: true,
      },
      {
        name: 'hintArtifactId',
        label: 'Ledtrådsartefakt',
        type: 'artifact',
        required: true,
      },
    ],
  },

  // ===========================================================================
  // Feedback Templates
  // ===========================================================================
  {
    id: 'signal-on-success',
    name: 'Framgångssignal',
    description: 'Skickar en visuell/ljud-signal vid framgång',
    category: 'feedback',
    complexity: 'beginner',
    icon: 'zap',
    tags: ['signal', 'framgång', 'ljus'],
    when: {
      type: 'keypad_correct',
      keypadId: '{{keypadId}}',
    },
    then: [
      { type: 'send_signal', channel: '{{channel}}' },
    ],
    executeOnce: false,
    variables: [
      {
        name: 'keypadId',
        label: 'Keypad',
        type: 'artifact',
        required: true,
      },
      {
        name: 'channel',
        label: 'Signalkanal',
        type: 'channel',
        defaultValue: 'success',
        required: true,
      },
    ],
  },
  {
    id: 'message-on-complete',
    name: 'Gratulationsmeddelande',
    description: 'Skickar ett meddelande till deltagarna vid ett steg',
    category: 'feedback',
    complexity: 'beginner',
    icon: 'message-circle',
    tags: ['meddelande', 'grattis', 'feedback'],
    when: {
      type: 'step_completed',
      stepId: '{{stepId}}',
    },
    then: [
      { type: 'send_message', message: '{{message}}', channel: 'all' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'stepId',
        label: 'Steg',
        type: 'step',
        required: true,
      },
      {
        name: 'message',
        label: 'Meddelande',
        type: 'string',
        defaultValue: 'Bra jobbat! Ni klarade det!',
        required: true,
      },
    ],
  },
  {
    id: 'timebank-warning',
    name: 'Tidsvarning',
    description: 'Skickar varningssignal och meddelande när tidsbanken är låg',
    category: 'feedback',
    complexity: 'intermediate',
    icon: 'alert-triangle',
    tags: ['tid', 'varning', 'signal'],
    when: {
      type: 'signal_received',
      channel: 'timebank_warning',
    },
    then: [
      { type: 'send_signal', channel: 'warning' },
      { type: 'send_message', message: 'Skynda er! Tiden håller på att ta slut!', channel: 'all' },
    ],
    executeOnce: false,
    variables: [],
  },

  // ===========================================================================
  // Advanced Templates
  // ===========================================================================
  {
    id: 'multi-puzzle-unlock',
    name: 'Kombinationslås (flera pussel)',
    description: 'Låser upp något när flera pussel är lösta (kräver counter)',
    category: 'advanced',
    complexity: 'advanced',
    icon: 'lock',
    tags: ['kombination', 'flera', 'counter', 'lås'],
    when: {
      type: 'counter_reached',
      counterKey: '{{counterKey}}',
      targetValue: '{{targetValue}}',
    },
    then: [
      { type: 'reveal_artifact', artifactId: '{{unlockedArtifactId}}' },
      { type: 'send_signal', channel: 'success' },
      { type: 'send_message', message: '{{message}}', channel: 'all' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'counterKey',
        label: 'Counter-nyckel',
        type: 'string',
        description: 'Identifierare för räknaren som spårar framsteg',
        required: true,
      },
      {
        name: 'targetValue',
        label: 'Målvärde',
        type: 'number',
        description: 'Antalet pussel som måste lösas',
        defaultValue: 3,
        required: true,
      },
      {
        name: 'unlockedArtifactId',
        label: 'Artefakt att låsa upp',
        type: 'artifact',
        required: true,
      },
      {
        name: 'message',
        label: 'Framgångsmeddelande',
        type: 'string',
        defaultValue: 'Kombinationen är korrekt!',
        required: false,
      },
    ],
    examples: [
      'Tre symboler måste placeras rätt för att öppna portalen',
      'Fyra nycklar behövs för att låsa upp kistan',
    ],
  },
  {
    id: 'escape-room-finale',
    name: 'Escape Room-final',
    description: 'Komplett avslutningssekvens med nedräkning, avslöjanden och firande',
    category: 'advanced',
    complexity: 'advanced',
    icon: 'trophy',
    tags: ['escape', 'final', 'avslutning'],
    when: {
      type: 'artifact_unlocked',
      artifactId: '{{finalArtifactId}}',
    },
    then: [
      { type: 'time_bank_pause', pause: true },
      { type: 'send_signal', channel: 'victory' },
      { type: 'show_countdown', duration: 5, message: 'Grattis!' },
      { type: 'reveal_artifact', artifactId: '{{victoryArtifactId}}' },
      { type: 'advance_step' },
    ],
    executeOnce: true,
    variables: [
      {
        name: 'finalArtifactId',
        label: 'Sista pusslet/artefakten',
        type: 'artifact',
        required: true,
      },
      {
        name: 'victoryArtifactId',
        label: 'Gratulationsartefakt',
        type: 'artifact',
        required: true,
      },
    ],
    examples: [
      'Öppna utgångsdörren och visa "Ni klarade det!"',
      'Avslöja den sista ledtråden och pausa tiden',
    ],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TriggerTemplateCategory): TriggerTemplate[] {
  return TRIGGER_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get templates by complexity
 */
export function getTemplatesByComplexity(
  complexity: TriggerTemplate['complexity']
): TriggerTemplate[] {
  return TRIGGER_TEMPLATES.filter((t) => t.complexity === complexity);
}

/**
 * Search templates by text
 */
export function searchTemplates(query: string): TriggerTemplate[] {
  const lowerQuery = query.toLowerCase();
  return TRIGGER_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Apply variable values to a template
 */
export function applyTemplateVariables(
  template: TriggerTemplate,
  values: Record<string, unknown>
): { when: TriggerCondition; then: TriggerAction[] } {
  const replaceVariables = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      // Replace {{variable}} placeholders
      return obj.replace(/\{\{(\w+)\}\}/g, (_, name) => {
        const value = values[name];
        return value !== undefined ? String(value) : `{{${name}}}`;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceVariables);
    }
    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceVariables(value);
      }
      return result;
    }
    return obj;
  };

  return {
    when: replaceVariables(template.when) as TriggerCondition,
    then: replaceVariables(template.then) as TriggerAction[],
  };
}
