import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getGameByIdPreview, getRelatedGames } from '@/lib/services/games.server'
import { getUserReactionForGame } from '@/lib/services/game-reactions.server'
import { mapDbGameToDetailPreview, mapDbGameToSummary } from '@/lib/game-display'
import type { DbGame } from '@/lib/game-display'
import { GameStartActions } from '@/components/game/GameStartActions'
import { GameCard } from '@/components/game/GameCard'
import {
  GameDetailHeader,
  GameDetailBadges,
  GameDetailAbout,
  GameDetailSteps,
  GameDetailMaterials,
  GameDetailSafety,
  GameDetailPreparation,
  GameDetailPhases,
  GameDetailGallery,
  GameDetailRoles,
  GameDetailArtifacts,
  GameDetailTriggers,
  GameDetailQuickFacts,
  GameDetailSidebar,
  // P1 components
  GameDetailAccessibility,
  GameDetailRequirements,
  GameDetailBoard,
  GameDetailTools,
  getSectionConfig,
} from '@/components/game/GameDetails'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

type Props = {
  params: Promise<{ gameId: string }>;
};

export default async function GameDetailPage({ params }: Props) {
  const t = await getTranslations('app.gameDetail')
  const { gameId } = await params;
  
  // Use new preview query
  const dbGame = await getGameByIdPreview(gameId)
  
  if (!dbGame) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('notFoundTitle')}</h1>
          <Link
            href="/app/browse"
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t('backToBrowse')}
          </Link>
        </div>
      </div>
    )
  }

  // Map to GameDetailData using new mapper
  const game = mapDbGameToDetailPreview(dbGame as unknown as DbGame)
  
  // User-specific reaction (like/dislike) for this game (null when unauthenticated)
  const initialReaction = await getUserReactionForGame(game.id)

  // Get section visibility config based on mode and playMode
  const config = getSectionConfig('preview', game.playMode)
  
  // Get related games
  const relatedGames = await getRelatedGames(dbGame, 4)

  // Media for gallery (non-cover images)
  const media = dbGame.media ?? []
  const cover = media.find((m) => m.kind === 'cover') ?? media[0]
  const gallery = media.filter((m) => m !== cover)

  return (
    <div className="space-y-6">
      {/* Header with title, cover, back link */}
      <GameDetailHeader
        game={game}
        backLink={{ href: '/app/browse', label: t('backToBrowse') }}
        label={t('label')}
      />

      {/* Badges */}
      {config.badges && <GameDetailBadges game={game} />}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          {config.about && (
            <GameDetailAbout
              game={game}
              labels={{
                title: t('sections.about'),
              }}
            />
          )}

          {/* Steps */}
          {config.steps && (
            <GameDetailSteps
              game={game}
              labels={{
                title: t('sections.instructions'),
                approxMinutes: '~{minutes} min',
              }}
            />
          )}

          {/* Materials */}
          {config.materials && (
            <GameDetailMaterials
              game={game}
              labels={{
                title: t('sections.materials'),
              }}
            />
          )}

          {/* Safety */}
          {config.safety && (
            <GameDetailSafety
              game={game}
              labels={{
                title: t('sections.safety'),
              }}
            />
          )}

          {/* Preparation */}
          {config.preparation && (
            <GameDetailPreparation
              game={game}
              labels={{
                title: t('sections.preparation'),
              }}
            />
          )}

          {/* P1: Accessibility */}
          {config.accessibility && (
            <GameDetailAccessibility
              game={game}
              labels={{
                title: t('sections.accessibility'),
              }}
            />
          )}

          {/* P1: Requirements */}
          {config.requirements && (
            <GameDetailRequirements
              game={game}
              labels={{
                title: t('sections.requirements'),
              }}
            />
          )}

          {/* Phases (facilitated mode) */}
          {config.phases && (
            <GameDetailPhases
              game={game}
              labels={{
                title: t('sections.phases'),
                goal: t('phases.goal'),
                duration: t('phases.duration'),
              }}
            />
          )}

          {/* P1: Board config (facilitated/participants mode) */}
          {config.board && (
            <GameDetailBoard
              game={game}
              labels={{
                title: t('sections.board'),
              }}
            />
          )}

          {/* Gallery */}
          {config.gallery && (
            <GameDetailGallery
              game={game}
              galleryItems={gallery}
              labels={{
                title: t('sections.images'),
              }}
            />
          )}

          {/* Roles (lazy-loaded, participant mode only) */}
          {config.roles && (
            <GameDetailRoles
              game={game}
              labels={{
                title: t('sections.roles'),
                loading: t('loading'),
                error: t('loadError'),
                count: t('roles.count'),
              }}
            />
          )}

          {/* Artifacts (lazy-loaded) */}
          {config.artifacts && (
            <GameDetailArtifacts
              game={game}
              labels={{
                title: t('sections.artifacts'),
                loading: t('loading'),
                error: t('loadError'),
                variants: t('artifacts.variants'),
              }}
            />
          )}

          {/* Triggers (lazy-loaded) */}
          {config.triggers && (
            <GameDetailTriggers
              game={game}
              labels={{
                title: t('sections.triggers'),
                loading: t('loading'),
                error: t('loadError'),
                condition: t('triggers.condition'),
                effect: t('triggers.effect'),
              }}
            />
          )}

          {/* P1: Facilitator Tools */}
          {config.tools && (
            <GameDetailTools
              game={game}
              labels={{
                title: t('sections.tools'),
              }}
            />
          )}

          {/* Quick Facts Grid */}
          {config.quickFacts && (
            <GameDetailQuickFacts
              game={game}
              labels={{
                title: t('sections.details'),
                participants: t('details.participants'),
                time: t('details.time'),
                age: t('details.age'),
                energy: t('details.energy'),
                playersRange: t('playersRange', { min: '{min}', max: '{max}' }),
                ageRange: t('ageRange', { min: '{min}', max: '{max}' }),
                approxMinutes: t('approxMinutes', { minutes: '{min}' }),
              }}
              energyLabels={{
                low: t('energy.low'),
                medium: t('energy.medium'),
                high: t('energy.high'),
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        {config.sidebar && (
          <GameDetailSidebar
            game={game}
            gameId={game.id}
            gameName={game.title}
            labels={{
              quickInfoTitle: t('sections.quickInfo'),
              status: t('sidebar.status'),
              published: t('sidebar.published'),
              draft: t('sidebar.draft'),
              addedAt: t('sidebar.addedAt'),
            }}
            className="lg:col-span-1"
          >
            {/* Unified Game Actions: Start Session + Like + Share */}
            <GameStartActions
              gameId={game.id}
              gameName={game.title}
              initialReaction={initialReaction}
              showShare={true}
              labels={{
                share: t('actions.share'),
              }}
            />
          </GameDetailSidebar>
        )}
      </div>

      {/* Related Games */}
      {relatedGames.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Liknande lekar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedGames.map((relatedGame) => {
              const summary = mapDbGameToSummary(relatedGame as unknown as DbGame);
              return (
                <GameCard
                  key={relatedGame.id}
                  game={summary}
                  variant="mini"
                  actions={{ href: `/app/games/${relatedGame.id}` }}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  )
}
