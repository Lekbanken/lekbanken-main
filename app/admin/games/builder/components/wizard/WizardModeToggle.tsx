'use client';

/**
 * WizardModeToggle
 *
 * Toggles between Simple and Advanced mode.
 * - Simple: No phases, steps have phase_id = null
 * - Advanced: Phases enabled with default structure
 *
 * Uses wizard/actions.ts for mode switching - NO shadow state.
 */

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import {
  switchToAdvancedMode,
  switchToSimpleMode,
} from '@/lib/builder/wizard';
import type { BuilderAction, StepData, PhaseData } from '@/types/game-builder-state';

// =============================================================================
// Types
// =============================================================================

export interface WizardModeToggleProps {
  /** Current phases in the builder */
  phases: PhaseData[];
  /** Current steps in the builder */
  steps: StepData[];
  /** Dispatch function from useGameBuilder */
  dispatch: React.Dispatch<BuilderAction>;
  /** Optional callback when mode changes */
  onModeChange?: (mode: 'simple' | 'advanced') => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show labels */
  showLabels?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function WizardModeToggle({
  phases,
  steps,
  dispatch,
  onModeChange,
  size = 'md',
  showLabels = true,
}: WizardModeToggleProps) {
  const t = useTranslations('admin.games.builder.wizard');

  // Derive current mode from state (phases exist = advanced)
  const isAdvancedMode = phases.length > 0;

  const handleToggle = useCallback((checked: boolean) => {
    // checked = true means Advanced mode
    if (checked) {
      // Switch to advanced mode
      const actions = switchToAdvancedMode(phases, steps);
      for (const action of actions) {
        dispatch(action);
      }
      onModeChange?.('advanced');
    } else {
      // Switch to simple mode
      const actions = switchToSimpleMode(steps);
      for (const action of actions) {
        dispatch(action);
      }
      onModeChange?.('simple');
    }
  }, [phases, steps, dispatch, onModeChange]);

  return (
    <div className={`flex items-center gap-3 ${size === 'sm' ? 'text-sm' : ''}`}>
      {showLabels && (
        <Label
          htmlFor="wizard-mode-toggle"
          className={`text-muted-foreground ${!isAdvancedMode ? 'font-medium text-foreground' : ''}`}
        >
          {t('mode.simple', { defaultValue: 'Enkel' })}
        </Label>
      )}
      <Switch
        id="wizard-mode-toggle"
        checked={isAdvancedMode}
        onCheckedChange={handleToggle}
        aria-label={t('mode.toggleLabel', { defaultValue: 'Växla mellan enkel och avancerad' })}
      />
      {showLabels && (
        <Label
          htmlFor="wizard-mode-toggle"
          className={`text-muted-foreground ${isAdvancedMode ? 'font-medium text-foreground' : ''}`}
        >
          {t('mode.advanced', { defaultValue: 'Avancerad' })}
        </Label>
      )}
    </div>
  );
}
