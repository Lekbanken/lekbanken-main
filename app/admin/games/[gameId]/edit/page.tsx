'use client';

import { use } from 'react';
import { GameBuilderPage } from '../../builder/GameBuilderPage';

export default function GameBuilderEditPage({ 
  params 
}: { 
  params: Promise<{ gameId: string }> 
}) {
  const { gameId } = use(params);
  return <GameBuilderPage gameId={gameId} />;
}
