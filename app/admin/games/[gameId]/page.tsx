import { GameDetailPage } from '@/features/admin/games/GameDetailPage';

type PageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GamesDetailRoute({ params }: PageProps) {
  const { gameId } = await params;
  return <GameDetailPage gameId={gameId} />;
}
