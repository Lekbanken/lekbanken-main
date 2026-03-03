/**
 * DirectorPreviewClient — Thin adapter for offline Director Mode Preview
 *
 * Renders DirectorModeDrawer in `mode="preview"` with:
 *   - Game → Cockpit type mapping (one-time)
 *   - Local step navigation handled inside the Drawer
 *   - Full shell features (fullscreen, keyboard, swipe, scroll lock)
 *   - No session, no realtime, no side-effects
 *   - Close navigates back to game detail page
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DirectorModeDrawer } from '@/features/play/components/DirectorModeDrawer';
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
  backHref: string;
}

export default function DirectorPreviewClient({
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

  const handleClose = useCallback(() => {
    router.push(backHref);
  }, [router, backHref]);

  return (
    <DirectorModeDrawer
      mode="preview"
      open={true}
      onClose={handleClose}
      title={gameTitle}
      steps={steps}
      phases={phases}
      triggers={triggers}
      artifacts={artifacts}
      artifactStates={artifactStates}
    />
  );
}
