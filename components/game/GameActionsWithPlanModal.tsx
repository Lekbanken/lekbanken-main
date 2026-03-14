'use client';

/**
 * GameActionsWithPlanModal
 *
 * Client wrapper that combines GameStartActions with AddToPlanModal.
 * Needed because the game detail page is a Server Component.
 */

import { useState } from 'react';
import { GameStartActions, type GameStartActionsProps } from '@/components/game/GameStartActions';
import { AddToPlanModal } from '@/features/planner/components/AddToPlanModal';

type GameActionsWithPlanModalProps = GameStartActionsProps;

export function GameActionsWithPlanModal(props: GameActionsWithPlanModalProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <GameStartActions
        {...props}
        showAddToPlan
        onAddToPlan={() => setModalOpen(true)}
      />
      <AddToPlanModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        gameId={props.gameId}
        gameName={props.gameName}
      />
    </>
  );
}
