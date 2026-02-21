/**
 * DirectorPreviewClient — Client component for Director Mode Preview
 *
 * Wraps DirectorModePanel with:
 *   - Game → Cockpit type mapping
 *   - Local step navigation (useState for currentStepIndex)
 *   - No realtime, no session, no side-effects
 *   - Back button navigates to game detail page
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DirectorModePanel } from '@/features/play/components/DirectorModePanel';
import {
  mapGameStepsToCockpit,
  mapGamePhasesToCockpit,
  mapGameArtifactsToCockpit,
  mapGameTriggersToCockpit,
} from '@/lib/play/game-to-cockpit';
import type { GameStep, GamePhase, GameArtifact, GameTrigger } from '@/lib/game-display/types';

interface DirectorPreviewClientProps {
  gameId: string;
  gameTitle: string;
  steps: GameStep[];
  phases: GamePhase[];
  artifacts: GameArtifact[];
  triggers: GameTrigger[];
  backLabel: string;
  backHref: string;
}

export default function DirectorPreviewClient({
  gameId: _gameId,
  gameTitle,
  steps: rawSteps,
  phases: rawPhases,
  artifacts: rawArtifacts,
  triggers: rawTriggers,
  backHref,
}: DirectorPreviewClientProps) {
  const router = useRouter();

  // Map game types → cockpit types (once, stable refs)
  const [steps] = useState(() => mapGameStepsToCockpit(rawSteps));
  const [phases] = useState(() => mapGamePhasesToCockpit(rawPhases));
  const [{ artifacts, artifactStates }] = useState(() => mapGameArtifactsToCockpit(rawArtifacts));
  const [triggers] = useState(() => mapGameTriggersToCockpit(rawTriggers));

  // Local step navigation
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const handlePrevious = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleClose = useCallback(() => {
    router.push(backHref);
  }, [router, backHref]);

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <DirectorModePanel
        title={gameTitle}
        status="draft"
        isPreview
        steps={steps}
        currentStepIndex={currentStepIndex}
        phases={phases}
        currentPhaseIndex={0}
        triggers={triggers}
        recentSignals={[]}
        events={[]}
        timeBankBalance={0}
        timeBankPaused={false}
        participantCount={0}
        artifacts={artifacts}
        artifactStates={artifactStates}
        onNextStep={handleNext}
        onPreviousStep={handlePrevious}
        onClose={handleClose}
      />
    </div>
  );
}
