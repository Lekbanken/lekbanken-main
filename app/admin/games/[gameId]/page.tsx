import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { GameDetailPage } from '@/features/admin/games/GameDetailPage';

type PageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GamesDetailRoute({ params }: PageProps) {
  await requireSystemAdmin('/admin');
  const { gameId } = await params;
  return <GameDetailPage gameId={gameId} />;
}
