'use client';

import { use } from 'react';
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard';
import { GameBuilderPage } from '../../builder/GameBuilderPage';

export default function GameBuilderEditPage({ 
  params 
}: { 
  params: Promise<{ gameId: string }> 
}) {
  const { gameId } = use(params);
  return (
    <SystemAdminClientGuard>
      <GameBuilderPage gameId={gameId} />
    </SystemAdminClientGuard>
  );
}
