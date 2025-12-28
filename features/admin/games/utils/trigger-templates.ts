/**
 * Trigger Template Library
 *
 * Pre-built trigger templates for common game patterns.
 * Organized by game type/category for easy discovery.
 */

import type { TriggerFormData } from '@/types/games';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';

// =============================================================================
// Template Types
// =============================================================================

export type TriggerTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  triggers: TriggerFormData[];
};

export type TemplateCategory = 
  | 'escape_room'
  | 'party_game'
  | 'timer_based'
  | 'progressive_reveal'
  | 'competition'
  | 'educational';

export type CategoryInfo = {
  id: TemplateCategory;
  name: string;
  description: string;
  icon: string;
};

// =============================================================================
// Category Metadata
// =============================================================================

export const TEMPLATE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'escape_room',
    name: 'Escape Room',
    description: 'Låsa upp ledtrådar, hemliga rum och finaler',
    icon: '🔐',
  },
  {
    id: 'party_game',
    name: 'Partyspel',
    description: 'Nedräkningar, dramatiska avslöjanden',
    icon: '🎉',
  },
  {
    id: 'timer_based',
    name: 'Tidsstyrda',
    description: 'Timer-baserade triggers med bonusar/straff',
    icon: '⏱️',
  },
  {
    id: 'progressive_reveal',
    name: 'Progressivt avslöjande',
    description: 'Låsa upp innehåll steg för steg',
    icon: '📜',
  },
  {
    id: 'competition',
    name: 'Tävling',
    description: 'Poäng, leaderboards, vinnare',
    icon: '🏆',
  },
  {
    id: 'educational',
    name: 'Utbildning',
    description: 'Lärande och quiz-mönster',
    icon: '📚',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

function createTrigger(
  name: string,
  condition: TriggerCondition,
  actions: TriggerAction[],
  options?: Partial<TriggerFormData>
): TriggerFormData {
  return {
    id: makeId(),
    name,
    description: options?.description ?? '',
    enabled: options?.enabled ?? true,
    condition,
    actions,
    execute_once: options?.execute_once ?? true,
    delay_seconds: options?.delay_seconds ?? 0,
  };
}

// =============================================================================
// Escape Room Templates
// =============================================================================

const ESCAPE_ROOM_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'escape-keypad-reveal',
    name: 'Keypad → Reveal Clue',
    description: 'When a keypad code is correct, reveal a hidden clue artifact',
    category: 'escape_room',
    triggers: [
      createTrigger(
        'Keypad rätt → Visa ledtråd',
        { type: 'keypad_correct', keypadId: '' },
        [
          { type: 'send_message', message: '✅ Korrekt kod!', style: 'dramatic' },
          { type: 'reveal_artifact', artifactId: '' },
        ]
      ),
    ],
  },
  {
    id: 'escape-keypad-wrong',
    name: 'Keypad Wrong → Time Penalty',
    description: 'Deduct time when wrong code is entered',
    category: 'escape_room',
    triggers: [
      createTrigger(
        'Keypad fel → Tidsstraff',
        { type: 'keypad_failed', keypadId: '' },
        [
          { type: 'send_message', message: '❌ Fel kod! -30 sekunder', style: 'normal' },
          { type: 'time_bank_apply_delta', deltaSeconds: -30, reason: 'Fel kod' },
        ]
      ),
    ],
  },
  {
    id: 'escape-final-reveal',
    name: 'Final Phase → Victory',
    description: 'Show victory message and countdown when final phase starts',
    category: 'escape_room',
    triggers: [
      createTrigger(
        'Slutfas → Seger!',
        { type: 'phase_started', phaseId: '' },
        [
          { type: 'show_countdown', duration: 10, message: 'Ni har löst gåtan!' },
          { type: 'send_message', message: '🎊 GRATTIS! Ni har lyckats fly!', style: 'dramatic' },
        ]
      ),
    ],
  },
  {
    id: 'escape-progressive-hints',
    name: 'Step Completion → Next Hint',
    description: 'Progressively reveal hints as steps are completed',
    category: 'escape_room',
    triggers: [
      createTrigger(
        'Steg klart → Nästa ledtråd',
        { type: 'step_completed', stepId: '' },
        [
          { type: 'reveal_artifact', artifactId: '' },
          { type: 'send_message', message: '🔓 Ny ledtråd upplåst!', style: 'normal' },
        ]
      ),
    ],
  },
];

// =============================================================================
// Party Game Templates
// =============================================================================

const PARTY_GAME_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'party-countdown-start',
    name: 'Phase Start → Countdown',
    description: 'Show dramatic countdown when a round begins',
    category: 'party_game',
    triggers: [
      createTrigger(
        'Fas börjar → Nedräkning',
        { type: 'phase_started', phaseId: '' },
        [
          { type: 'show_countdown', duration: 5, message: 'Rundan börjar om...' },
        ]
      ),
    ],
  },
  {
    id: 'party-dramatic-reveal',
    name: 'Manual → Dramatic Reveal',
    description: 'Manually trigger a dramatic reveal with typewriter effect',
    category: 'party_game',
    triggers: [
      createTrigger(
        'Dramatiskt avslöjande',
        { type: 'manual' },
        [
          { type: 'send_message', message: 'Och svaret är...', style: 'typewriter' },
          { type: 'reveal_artifact', artifactId: '' },
        ],
        { delay_seconds: 3 }
      ),
    ],
  },
  {
    id: 'party-round-timer',
    name: 'Phase Start → Start Timer',
    description: 'Automatically start a timer when the round begins',
    category: 'party_game',
    triggers: [
      createTrigger(
        'Fas börjar → Starta timer',
        { type: 'phase_started', phaseId: '' },
        [
          { type: 'start_timer', duration: 60, name: 'Rundtimer' },
          { type: 'send_message', message: '⏱️ Ni har 60 sekunder!', style: 'normal' },
        ]
      ),
    ],
  },
];

// =============================================================================
// Timer-Based Templates
// =============================================================================

const TIMER_BASED_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'timer-bonus-early',
    name: 'Step Complete → Time Bonus',
    description: 'Reward fast completion with bonus time',
    category: 'timer_based',
    triggers: [
      createTrigger(
        'Steg klart → Tidsbonus',
        { type: 'step_completed', stepId: '' },
        [
          { type: 'time_bank_apply_delta', deltaSeconds: 30, reason: 'Snabb lösning!' },
          { type: 'send_message', message: '⏱️ +30 sekunder bonus!', style: 'normal' },
        ]
      ),
    ],
  },
  {
    id: 'timer-signal-pause',
    name: 'Signal → Pause/Resume Time',
    description: 'Use signals to control time bank',
    category: 'timer_based',
    triggers: [
      createTrigger(
        'Signal: Pausa tid',
        { type: 'signal_received', channel: 'time:pause' },
        [
          { type: 'send_message', message: '⏸️ Tiden är pausad', style: 'normal' },
        ]
      ),
    ],
  },
  {
    id: 'timer-warning',
    name: 'Timer Ends → Warning',
    description: 'Show warning when timer runs out',
    category: 'timer_based',
    triggers: [
      createTrigger(
        'Timer slut → Varning',
        { type: 'timer_ended', timerId: '' },
        [
          { type: 'send_message', message: '⚠️ Tiden är slut!', style: 'dramatic' },
        ]
      ),
    ],
  },
];

// =============================================================================
// Progressive Reveal Templates
// =============================================================================

const PROGRESSIVE_REVEAL_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'progressive-step-unlock',
    name: 'Step → Unlock Artifact',
    description: 'Reveal content as players progress through steps',
    category: 'progressive_reveal',
    triggers: [
      createTrigger(
        'Steg → Visa innehåll',
        { type: 'step_started', stepId: '' },
        [
          { type: 'reveal_artifact', artifactId: '' },
        ]
      ),
    ],
  },
  {
    id: 'progressive-chain',
    name: 'Artifact Unlock → Next Artifact',
    description: 'Chain reveals - one artifact unlocks the next',
    category: 'progressive_reveal',
    triggers: [
      createTrigger(
        'Kedjeupplåsning',
        { type: 'artifact_unlocked', artifactId: '' },
        [
          { type: 'reveal_artifact', artifactId: '' },
          { type: 'send_message', message: '🔗 Nästa del upplåst!', style: 'normal' },
        ],
        { delay_seconds: 2 }
      ),
    ],
  },
  {
    id: 'progressive-all-steps',
    name: 'Phase Complete → Reveal Summary',
    description: 'Show summary when all steps in a phase are done',
    category: 'progressive_reveal',
    triggers: [
      createTrigger(
        'Fas klar → Visa sammanfattning',
        { type: 'phase_completed', phaseId: '' },
        [
          { type: 'reveal_artifact', artifactId: '' },
          { type: 'send_message', message: '📋 Sammanfattning tillgänglig', style: 'normal' },
        ]
      ),
    ],
  },
];

// =============================================================================
// Competition Templates
// =============================================================================

const COMPETITION_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'competition-point-award',
    name: 'Keypad Correct → Award Points',
    description: 'Award time bonus as points for correct answers',
    category: 'competition',
    triggers: [
      createTrigger(
        'Rätt svar → Poäng',
        { type: 'keypad_correct', keypadId: '' },
        [
          { type: 'time_bank_apply_delta', deltaSeconds: 100, reason: 'Rätt svar!' },
          { type: 'send_message', message: '🎯 +100 poäng!', style: 'dramatic' },
        ]
      ),
    ],
  },
  {
    id: 'competition-finish-line',
    name: 'Step Complete → Victory',
    description: 'First to complete step wins',
    category: 'competition',
    triggers: [
      createTrigger(
        'Målgång!',
        { type: 'step_completed', stepId: '' },
        [
          { type: 'show_countdown', duration: 3, message: '🏆 VINNARE!' },
          { type: 'send_message', message: '🥇 Först i mål!', style: 'dramatic' },
        ]
      ),
    ],
  },
];

// =============================================================================
// Educational Templates
// =============================================================================

const EDUCATIONAL_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'edu-quiz-correct',
    name: 'Quiz Correct → Next Question',
    description: 'Progress to next question on correct answer',
    category: 'educational',
    triggers: [
      createTrigger(
        'Rätt svar → Nästa fråga',
        { type: 'keypad_correct', keypadId: '' },
        [
          { type: 'send_message', message: '✅ Rätt! Bra jobbat!', style: 'normal' },
          { type: 'advance_step' },
        ]
      ),
    ],
  },
  {
    id: 'edu-hint-system',
    name: 'Signal → Show Hint',
    description: 'Reveal hints when learner requests help',
    category: 'educational',
    triggers: [
      createTrigger(
        'Visa ledtråd',
        { type: 'signal_received', channel: 'hint:request' },
        [
          { type: 'reveal_artifact', artifactId: '' },
          { type: 'send_message', message: '💡 Här är ett tips!', style: 'normal' },
        ]
      ),
    ],
  },
  {
    id: 'edu-section-complete',
    name: 'Phase Complete → Summary',
    description: 'Show learning summary after completing a section',
    category: 'educational',
    triggers: [
      createTrigger(
        'Avsnitt klart → Sammanfattning',
        { type: 'phase_completed', phaseId: '' },
        [
          { type: 'reveal_artifact', artifactId: '' },
          { type: 'send_message', message: '📚 Du har klarat avsnittet!', style: 'dramatic' },
        ]
      ),
    ],
  },
];

// =============================================================================
// All Templates Export
// =============================================================================

export const TRIGGER_TEMPLATES: TriggerTemplate[] = [
  ...ESCAPE_ROOM_TEMPLATES,
  ...PARTY_GAME_TEMPLATES,
  ...TIMER_BASED_TEMPLATES,
  ...PROGRESSIVE_REVEAL_TEMPLATES,
  ...COMPETITION_TEMPLATES,
  ...EDUCATIONAL_TEMPLATES,
];

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: TemplateCategory): TriggerTemplate[] {
  return TRIGGER_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): TriggerTemplate | undefined {
  return TRIGGER_TEMPLATES.find((t) => t.id === id);
}

/**
 * Create fresh copies of triggers from a template (with new IDs)
 */
export function instantiateTemplate(template: TriggerTemplate): TriggerFormData[] {
  return template.triggers.map((t) => ({
    ...t,
    id: makeId(),
    // Clone actions to avoid shared references
    actions: t.actions.map((a) => ({ ...a })),
    condition: { ...t.condition },
  }));
}
