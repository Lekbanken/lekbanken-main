/**
 * useMultiLanguageScript Hook
 * 
 * React hook for managing multi-language leader scripts.
 * Handles language selection, translation lookup, and script navigation.
 * 
 * Backlog B.8: Multi-language leader script
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  SupportedLanguage,
  MultiLanguageScript,
  StepScript,
  PhaseScript,
  LeaderScriptBlock,
  TranslationStatus,
} from '@/lib/multi-language-script';
import {
  DEFAULT_LANGUAGE,
  getTranslation,
  getTranslationStatus,
  getScriptTranslationStatus,
} from '@/lib/multi-language-script';

// =============================================================================
// Types
// =============================================================================

export interface UseMultiLanguageScriptOptions {
  /** The multi-language script to use */
  script: MultiLanguageScript;
  /** Initial language (defaults to script default) */
  initialLanguage?: SupportedLanguage;
  /** Initial step index */
  initialStepIndex?: number;
  /** Initial phase */
  initialPhase?: 'intro' | 'main' | 'outro';
  /** Callback when language changes */
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export interface CurrentContent {
  /** Current step */
  step: StepScript | null;
  /** Current phase */
  phase: PhaseScript | null;
  /** Current blocks */
  blocks: LeaderScriptBlock[];
  /** Step name in current language */
  stepName: string;
  /** Phase title in current language */
  phaseTitle: string;
  /** Get block text in current language */
  getBlockText: (block: LeaderScriptBlock) => string;
}

export interface UseMultiLanguageScriptReturn {
  /** Current language */
  language: SupportedLanguage;
  /** Set current language */
  setLanguage: (lang: SupportedLanguage) => void;
  /** Available languages in script */
  availableLanguages: SupportedLanguage[];
  /** Current step index */
  currentStepIndex: number;
  /** Current phase */
  currentPhase: 'intro' | 'main' | 'outro';
  /** Navigate to step */
  goToStep: (stepIndex: number) => void;
  /** Navigate to phase */
  goToPhase: (phase: 'intro' | 'main' | 'outro') => void;
  /** Go to next step */
  nextStep: () => boolean;
  /** Go to previous step */
  prevStep: () => boolean;
  /** Go to next phase */
  nextPhase: () => boolean;
  /** Go to previous phase */
  prevPhase: () => boolean;
  /** Current content in selected language */
  content: CurrentContent;
  /** Game title in current language */
  gameTitle: string;
  /** Translation status for current language */
  translationStatus: TranslationStatus | null;
  /** Overall translation status for all languages */
  allTranslationStatus: Map<SupportedLanguage, { steps: TranslationStatus[]; overallCompletion: number }>;
  /** Is translation complete for current step */
  isTranslationComplete: boolean;
  /** Get text in current language with fallback */
  getText: (translations: Record<string, string>) => string;
}

// =============================================================================
// Hook
// =============================================================================

export function useMultiLanguageScript({
  script,
  initialLanguage,
  initialStepIndex = 0,
  initialPhase = 'intro',
  onLanguageChange,
}: UseMultiLanguageScriptOptions): UseMultiLanguageScriptReturn {
  // State
  const [language, setLanguageState] = useState<SupportedLanguage>(
    initialLanguage ?? script.defaultLanguage ?? DEFAULT_LANGUAGE
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'main' | 'outro'>(initialPhase);

  // Derived values
  const availableLanguages = script.availableLanguages;
  const totalSteps = script.steps.length;

  // Set language with callback
  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setLanguageState(lang);
      onLanguageChange?.(lang);
    },
    [onLanguageChange]
  );

  // Navigation
  const goToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < totalSteps) {
        setCurrentStepIndex(stepIndex);
      }
    },
    [totalSteps]
  );

  const goToPhase = useCallback((phase: 'intro' | 'main' | 'outro') => {
    setCurrentPhase(phase);
  }, []);

  const nextStep = useCallback((): boolean => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setCurrentPhase('intro');
      return true;
    }
    return false;
  }, [currentStepIndex, totalSteps]);

  const prevStep = useCallback((): boolean => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setCurrentPhase('intro');
      return true;
    }
    return false;
  }, [currentStepIndex]);

  const phaseOrder = useMemo<('intro' | 'main' | 'outro')[]>(() => ['intro', 'main', 'outro'], []);

  const nextPhase = useCallback((): boolean => {
    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    if (currentPhaseIndex < phaseOrder.length - 1) {
      setCurrentPhase(phaseOrder[currentPhaseIndex + 1]);
      return true;
    }
    // Try next step
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setCurrentPhase('intro');
      return true;
    }
    return false;
  }, [currentPhase, currentStepIndex, totalSteps, phaseOrder]);

  const prevPhase = useCallback((): boolean => {
    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    if (currentPhaseIndex > 0) {
      setCurrentPhase(phaseOrder[currentPhaseIndex - 1]);
      return true;
    }
    // Try previous step
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setCurrentPhase('outro');
      return true;
    }
    return false;
  }, [currentPhase, currentStepIndex, phaseOrder]);

  // Get text helper
  const getText = useCallback(
    (translations: Record<string, string>): string => {
      return getTranslation(translations, language, script.defaultLanguage);
    },
    [language, script.defaultLanguage]
  );

  // Current content
  const content = useMemo<CurrentContent>(() => {
    const step = script.steps[currentStepIndex] ?? null;
    const phase = step?.phases.find((p) => p.phaseId === currentPhase) ?? null;
    const blocks = phase?.blocks ?? [];

    return {
      step,
      phase,
      blocks,
      stepName: step ? getText(step.name) : '',
      phaseTitle: phase ? getText(phase.title) : '',
      getBlockText: (block: LeaderScriptBlock) => getText(block.translations),
    };
  }, [script, currentStepIndex, currentPhase, getText]);

  // Game title
  const gameTitle = useMemo(() => getText(script.title), [script.title, getText]);

  // Translation status
  const translationStatus = useMemo<TranslationStatus | null>(() => {
    const step = script.steps[currentStepIndex];
    return step ? getTranslationStatus(step, language) : null;
  }, [script, currentStepIndex, language]);

  const allTranslationStatus = useMemo(
    () => getScriptTranslationStatus(script),
    [script]
  );

  const isTranslationComplete = translationStatus?.isComplete ?? true;

  return {
    language,
    setLanguage,
    availableLanguages,
    currentStepIndex,
    currentPhase,
    goToStep,
    goToPhase,
    nextStep,
    prevStep,
    nextPhase,
    prevPhase,
    content,
    gameTitle,
    translationStatus,
    allTranslationStatus,
    isTranslationComplete,
    getText,
  };
}
