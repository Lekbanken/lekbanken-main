import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getGameById } from '@/lib/services/games.server';
import { StartSessionButton } from './start-session-button';

type Props = {
  params: Promise<{ gameId: string }>;
};

export default async function StartGameSessionPage({ params }: Props) {
  const t = await getTranslations('app.play.startSession');
  const { gameId } = await params;
  const game = await getGameById(gameId);
  if (!game) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('eyebrow')}</p>
          <h1 className="text-2xl font-bold text-foreground">{game.name}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link href={`/app/games/${game.id}`} className="text-sm text-primary hover:underline">
          {t('backToGame')}
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <StartSessionButton gameId={game.id} gameName={game.name} />
      </div>
    </div>
  );
}
