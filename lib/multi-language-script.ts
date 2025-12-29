/**
 * Multi-Language Leader Script Types and Utilities
 * 
 * Provides type definitions and utilities for multi-language leader scripts.
 * Supports translation management and language switching.
 * 
 * Backlog B.8: Multi-language leader script
 */

// =============================================================================
// Types
// =============================================================================

/** Supported language codes */
export type SupportedLanguage = 'sv' | 'en' | 'no' | 'da' | 'fi' | 'de';

/** Language metadata */
export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

/** Translation entry for a single text */
export interface TranslationEntry {
  [lang: string]: string;
}

/** Leader script content block */
export interface LeaderScriptBlock {
  /** Block ID */
  id: string;
  /** Block type */
  type: 'heading' | 'instruction' | 'dialogue' | 'action' | 'note' | 'cue';
  /** Translations for this block */
  translations: TranslationEntry;
  /** Timing cue (optional) */
  timing?: string;
  /** Related artifact ID (optional) */
  artifactId?: string;
  /** Related trigger ID (optional) */
  triggerId?: string;
  /** Speaker for dialogue */
  speaker?: string;
  /** Order index */
  order: number;
}

/** Phase-level script content */
export interface PhaseScript {
  /** Phase identifier */
  phaseId: 'intro' | 'main' | 'outro';
  /** Phase title translations */
  title: TranslationEntry;
  /** Content blocks */
  blocks: LeaderScriptBlock[];
  /** Duration estimate (seconds) */
  estimatedDuration?: number;
}

/** Step-level script content */
export interface StepScript {
  /** Step ID */
  stepId: string;
  /** Step index */
  stepIndex: number;
  /** Step name translations */
  name: TranslationEntry;
  /** Phase scripts */
  phases: PhaseScript[];
  /** Available languages for this step */
  availableLanguages: SupportedLanguage[];
}

/** Complete multi-language script for a game */
export interface MultiLanguageScript {
  /** Game ID */
  gameId: string;
  /** Game title translations */
  title: TranslationEntry;
  /** Default language */
  defaultLanguage: SupportedLanguage;
  /** Available languages */
  availableLanguages: SupportedLanguage[];
  /** Step scripts */
  steps: StepScript[];
  /** Global notes */
  globalNotes?: TranslationEntry;
  /** Last updated */
  lastUpdated: string;
}

/** Translation status for a step */
export interface TranslationStatus {
  stepId: string;
  language: SupportedLanguage;
  totalBlocks: number;
  translatedBlocks: number;
  completionRate: number;
  isComplete: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Supported languages with metadata */
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

/** Default language */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'sv';

/** Block type labels */
export const BLOCK_TYPE_LABELS: Record<LeaderScriptBlock['type'], TranslationEntry> = {
  heading: { sv: 'Rubrik', en: 'Heading', no: 'Overskrift', da: 'Overskrift', fi: 'Otsikko', de: 'Überschrift' },
  instruction: { sv: 'Instruktion', en: 'Instruction', no: 'Instruksjon', da: 'Instruktion', fi: 'Ohje', de: 'Anweisung' },
  dialogue: { sv: 'Dialog', en: 'Dialogue', no: 'Dialog', da: 'Dialog', fi: 'Dialogi', de: 'Dialog' },
  action: { sv: 'Åtgärd', en: 'Action', no: 'Handling', da: 'Handling', fi: 'Toiminto', de: 'Aktion' },
  note: { sv: 'Notering', en: 'Note', no: 'Notat', da: 'Note', fi: 'Huomautus', de: 'Notiz' },
  cue: { sv: 'Ledtråd', en: 'Cue', no: 'Stikkord', da: 'Stikord', fi: 'Vihje', de: 'Stichwort' },
};

/** Phase labels */
export const PHASE_LABELS: Record<PhaseScript['phaseId'], TranslationEntry> = {
  intro: { sv: 'Introduktion', en: 'Introduction', no: 'Introduksjon', da: 'Introduktion', fi: 'Johdanto', de: 'Einführung' },
  main: { sv: 'Huvuddel', en: 'Main', no: 'Hoveddel', da: 'Hoveddel', fi: 'Pääosa', de: 'Hauptteil' },
  outro: { sv: 'Avslutning', en: 'Outro', no: 'Avslutning', da: 'Afslutning', fi: 'Lopetus', de: 'Abschluss' },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get language info by code
 */
export function getLanguageInfo(code: SupportedLanguage): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get translated text with fallback
 */
export function getTranslation(
  entry: TranslationEntry,
  language: SupportedLanguage,
  fallback: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  return entry[language] ?? entry[fallback] ?? Object.values(entry)[0] ?? '';
}

/**
 * Check if translation exists for language
 */
export function hasTranslation(entry: TranslationEntry, language: SupportedLanguage): boolean {
  return Boolean(entry[language] && entry[language].trim().length > 0);
}

/**
 * Get translation completion status for a step
 */
export function getTranslationStatus(
  step: StepScript,
  language: SupportedLanguage
): TranslationStatus {
  let totalBlocks = 0;
  let translatedBlocks = 0;

  step.phases.forEach((phase) => {
    phase.blocks.forEach((block) => {
      totalBlocks++;
      if (hasTranslation(block.translations, language)) {
        translatedBlocks++;
      }
    });
  });

  const completionRate = totalBlocks > 0 ? translatedBlocks / totalBlocks : 1;

  return {
    stepId: step.stepId,
    language,
    totalBlocks,
    translatedBlocks,
    completionRate,
    isComplete: completionRate === 1,
  };
}

/**
 * Get overall translation status for a script
 */
export function getScriptTranslationStatus(
  script: MultiLanguageScript
): Map<SupportedLanguage, { steps: TranslationStatus[]; overallCompletion: number }> {
  const status = new Map<SupportedLanguage, { steps: TranslationStatus[]; overallCompletion: number }>();

  script.availableLanguages.forEach((lang) => {
    const stepStatuses = script.steps.map((step) => getTranslationStatus(step, lang));
    const totalBlocks = stepStatuses.reduce((sum, s) => sum + s.totalBlocks, 0);
    const translatedBlocks = stepStatuses.reduce((sum, s) => sum + s.translatedBlocks, 0);
    const overallCompletion = totalBlocks > 0 ? translatedBlocks / totalBlocks : 1;

    status.set(lang, {
      steps: stepStatuses,
      overallCompletion,
    });
  });

  return status;
}

/**
 * Create empty translation entry with placeholder
 */
export function createTranslationEntry(
  defaultLanguage: SupportedLanguage,
  defaultText: string
): TranslationEntry {
  return { [defaultLanguage]: defaultText };
}

/**
 * Add translation to entry
 */
export function addTranslation(
  entry: TranslationEntry,
  language: SupportedLanguage,
  text: string
): TranslationEntry {
  return { ...entry, [language]: text };
}

/**
 * Remove translation from entry
 */
export function removeTranslation(
  entry: TranslationEntry,
  language: SupportedLanguage
): TranslationEntry {
  const { [language]: _, ...rest } = entry;
  return rest;
}

/**
 * Create empty leader script block
 */
export function createScriptBlock(
  type: LeaderScriptBlock['type'],
  defaultLanguage: SupportedLanguage,
  order: number
): LeaderScriptBlock {
  return {
    id: crypto.randomUUID(),
    type,
    translations: createTranslationEntry(defaultLanguage, ''),
    order,
  };
}

/**
 * Create empty phase script
 */
export function createPhaseScript(
  phaseId: PhaseScript['phaseId'],
  defaultLanguage: SupportedLanguage
): PhaseScript {
  return {
    phaseId,
    title: { [defaultLanguage]: PHASE_LABELS[phaseId][defaultLanguage] },
    blocks: [],
  };
}

/**
 * Create empty step script
 */
export function createStepScript(
  stepId: string,
  stepIndex: number,
  defaultLanguage: SupportedLanguage,
  name: string
): StepScript {
  return {
    stepId,
    stepIndex,
    name: createTranslationEntry(defaultLanguage, name),
    phases: [
      createPhaseScript('intro', defaultLanguage),
      createPhaseScript('main', defaultLanguage),
      createPhaseScript('outro', defaultLanguage),
    ],
    availableLanguages: [defaultLanguage],
  };
}

/**
 * Create empty multi-language script
 */
export function createMultiLanguageScript(
  gameId: string,
  title: string,
  defaultLanguage: SupportedLanguage = DEFAULT_LANGUAGE
): MultiLanguageScript {
  return {
    gameId,
    title: createTranslationEntry(defaultLanguage, title),
    defaultLanguage,
    availableLanguages: [defaultLanguage],
    steps: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Merge translations from another script (for importing)
 */
export function mergeTranslations(
  target: MultiLanguageScript,
  source: Partial<MultiLanguageScript>,
  language: SupportedLanguage
): MultiLanguageScript {
  const merged = { ...target };

  // Add language if not present
  if (!merged.availableLanguages.includes(language)) {
    merged.availableLanguages = [...merged.availableLanguages, language];
  }

  // Merge title
  if (source.title?.[language]) {
    merged.title = addTranslation(merged.title, language, source.title[language]);
  }

  // Merge step translations
  source.steps?.forEach((sourceStep) => {
    const targetStep = merged.steps.find((s) => s.stepId === sourceStep.stepId);
    if (targetStep) {
      // Merge step name
      if (sourceStep.name?.[language]) {
        targetStep.name = addTranslation(targetStep.name, language, sourceStep.name[language]);
      }

      // Merge phase translations
      sourceStep.phases?.forEach((sourcePhase) => {
        const targetPhase = targetStep.phases.find((p) => p.phaseId === sourcePhase.phaseId);
        if (targetPhase) {
          // Merge blocks
          sourcePhase.blocks?.forEach((sourceBlock) => {
            const targetBlock = targetPhase.blocks.find((b) => b.id === sourceBlock.id);
            if (targetBlock && sourceBlock.translations?.[language]) {
              targetBlock.translations = addTranslation(
                targetBlock.translations,
                language,
                sourceBlock.translations[language]
              );
            }
          });
        }
      });

      // Add language to step
      if (!targetStep.availableLanguages.includes(language)) {
        targetStep.availableLanguages = [...targetStep.availableLanguages, language];
      }
    }
  });

  merged.lastUpdated = new Date().toISOString();
  return merged;
}

/**
 * Export translations for a specific language (for external translation)
 */
export function exportForTranslation(
  script: MultiLanguageScript,
  sourceLanguage: SupportedLanguage = DEFAULT_LANGUAGE
): Record<string, { path: string; source: string; target: string }> {
  const entries: Record<string, { path: string; source: string; target: string }> = {};

  // Title
  entries['title'] = {
    path: 'title',
    source: getTranslation(script.title, sourceLanguage),
    target: '',
  };

  // Steps
  script.steps.forEach((step, stepIdx) => {
    const stepPath = `steps[${stepIdx}]`;
    
    entries[`${stepPath}.name`] = {
      path: `${stepPath}.name`,
      source: getTranslation(step.name, sourceLanguage),
      target: '',
    };

    step.phases.forEach((phase) => {
      const phasePath = `${stepPath}.${phase.phaseId}`;
      
      phase.blocks.forEach((block, blockIdx) => {
        const blockPath = `${phasePath}.blocks[${blockIdx}]`;
        entries[blockPath] = {
          path: blockPath,
          source: getTranslation(block.translations, sourceLanguage),
          target: '',
        };
      });
    });
  });

  return entries;
}

/**
 * Validate script structure
 */
export function validateScript(script: MultiLanguageScript): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!script.gameId) errors.push('Missing gameId');
  if (!script.defaultLanguage) errors.push('Missing defaultLanguage');
  if (!script.availableLanguages?.length) errors.push('No available languages');

  // Check title translation
  if (!hasTranslation(script.title, script.defaultLanguage)) {
    errors.push(`Missing title in default language (${script.defaultLanguage})`);
  }

  // Check steps
  script.steps.forEach((step, idx) => {
    if (!step.stepId) errors.push(`Step ${idx} missing stepId`);
    if (!hasTranslation(step.name, script.defaultLanguage)) {
      warnings.push(`Step ${idx} missing name in default language`);
    }

    // Check phases
    step.phases.forEach((phase) => {
      phase.blocks.forEach((block, blockIdx) => {
        if (!hasTranslation(block.translations, script.defaultLanguage)) {
          warnings.push(`Step ${idx}, ${phase.phaseId}, block ${blockIdx} missing text in default language`);
        }
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
