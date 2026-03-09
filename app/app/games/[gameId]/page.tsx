import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PencilIcon } from '@heroicons/react/24/outline'
import { getGameByIdPreview, getRelatedGames } from '@/lib/services/games.server'
import { getUserReactionForGame, getReactionCountsForGame } from '@/lib/services/game-reactions.server'
import { mapDbGameToDetailPreview } from '@/lib/game-display'
import type { DbGame } from '@/lib/game-display'
import { canViewGame } from '@/lib/game-display/access'
import { GameActionsWithPlanModal } from '@/components/game/GameActionsWithPlanModal'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
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
  // Sprint D components
  GameDetailLeaderTips,
  GameDetailMetadata,
  GameDetailOutcomes,
  // Sprint F components
  GameDetailRelated,
  getSectionConfig,
} from '@/components/game/GameDetails'

type Props = {
  params: Promise<{ gameId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId } = await params
  const dbGame = await getGameByIdPreview(gameId)

  if (!dbGame) {
    return { title: 'Lekbanken' }
  }

  const t = await getTranslations('app.gameDetail')
  const title = `${dbGame.name} | Lekbanken`
  const description = dbGame.short_description || t('descriptionFallback')

  const cover = dbGame.media?.find((m) => m.kind === 'cover')
  const coverUrl = cover?.media?.url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(coverUrl ? { images: [{ url: coverUrl }] } : {}),
    },
  }
}

export default async function GameDetailPage({ params }: Props) {
  const t = await getTranslations('app.gameDetail')
  const { gameId } = await params;
  
  // Use new preview query
  const dbGame = await getGameByIdPreview(gameId)

  // Enforce access: published games visible to all, drafts only to admins
  const access = await canViewGame(dbGame ? { id: dbGame.id, status: dbGame.status } : null)
  if (!access.allowed) {
    notFound()
  }

  const isAdmin = access.isAdmin

  // After access check, dbGame is guaranteed non-null (canViewGame(null) returns not-found → notFound())
  const game = mapDbGameToDetailPreview(dbGame! as unknown as DbGame, {
    boardWidgetLabels: {
      timerTitle: t('boardWidgets.timerTitle'),
      timerDetail: t('boardWidgets.timerDetail'),
      phaseNameTitle: t('boardWidgets.phaseNameTitle'),
      phaseNameDetail: t('boardWidgets.phaseNameDetail'),
      stepTextTitle: t('boardWidgets.stepTextTitle'),
      stepTextDetail: t('boardWidgets.stepTextDetail'),
      rolesTitle: t('boardWidgets.rolesTitle'),
      rolesDetail: t('boardWidgets.rolesDetail'),
      themeTitle: t('boardWidgets.themeTitle'),
    },
  })
  
  // User-specific reaction + aggregate like count (parallel)
  const [initialReaction, reactionCounts] = await Promise.all([
    getUserReactionForGame(game.id),
    getReactionCountsForGame(game.id),
  ])

  // Get section visibility config based on mode and playMode
  const config = getSectionConfig('preview', game.playMode)
  
  // Get related games
  const relatedGames = await getRelatedGames(dbGame!, 4)

  // Media for gallery (non-cover images)
  const media = dbGame!.media ?? []
  const cover = media.find((m) => m.kind === 'cover') ?? media[0]
  const gallery = media.filter((m) => m !== cover)

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: t('breadcrumbs.home'), href: '/app' },
          { label: t('breadcrumbs.games'), href: '/app/browse' },
          { label: game.title },
        ]}
      />

      {/* Header with title, cover, back link */}
      <GameDetailHeader
        game={game}
        backLink={{ href: '/app/browse', label: t('backToBrowse') }}
        label={t('label')}
      />

      {/* Badges */}
      {config.badges && (
        <GameDetailBadges
          game={game}
          durationLabels={{ unit: t('formatters.durationUnit') }}
          playersLabels={{ unit: t('formatters.playersUnit'), upTo: t('formatters.playersUpTo', { max: '{max}' }) }}
          ageLabels={{ unit: t('formatters.ageUnit'), upTo: t('formatters.ageUpTo', { max: '{max}' }) }}
          energyLabels={{
            low: t('formatters.energyLow'),
            lowShort: t('formatters.energyLowShort'),
            medium: t('formatters.energyMedium'),
            mediumShort: t('formatters.energyMediumShort'),
            high: t('formatters.energyHigh'),
            highShort: t('formatters.energyHighShort'),
          }}
        />
      )}

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
                highlights: t('about.highlights'),
              }}
            />
          )}

          {/* Sprint D: Outcomes */}
          {config.outcomes && (
            <GameDetailOutcomes
              game={game}
              labels={{
                title: t('sections.outcomes'),
              }}
            />
          )}

          {/* Steps */}
          {config.steps && (
            <GameDetailSteps
              game={game}
              labels={{
                title: t('sections.instructions'),
                hide: t('steps.hide'),
                showAll: t('steps.showAll', { count: '{count}', unit: '{unit}' }),
                showLess: t('steps.showLess'),
                steps: t('steps.stepsUnit'),
                optional: t('steps.optional'),
                approxMinutes: t('steps.approxMinutes', { minutes: '{minutes}' }),
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

          {/* Sprint D: Leader Tips */}
          {config.leaderTips && (
            <GameDetailLeaderTips
              game={game}
              labels={{
                title: t('sections.leaderTips'),
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
                phaseNumber: t('phases.phaseNumber', { number: '{number}' }),
              }}
            />
          )}

          {/* P1: Board config (facilitated/participants mode) */}
          {config.board && (
            <GameDetailBoard
              game={game}
              labels={{
                title: t('sections.board'),
                description: t('board.description'),
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
                loading: t('roles.loadingRoles'),
                error: t('roles.loadError'),
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
                loading: t('artifacts.loadingArtifacts'),
                error: t('artifacts.loadError'),
                variants: t('artifacts.variants'),
                use: t('artifacts.use'),
                openMap: t('artifacts.openMap'),
                mapLoadError: t('artifacts.mapLoadError'),
                mapNoAccess: t('artifacts.mapNoAccess'),
              }}
            />
          )}

          {/* Triggers (lazy-loaded) */}
          {config.triggers && (
            <GameDetailTriggers
              game={game}
              labels={{
                title: t('sections.triggers'),
                loading: t('triggers.loadingTriggers'),
                error: t('triggers.loadError'),
                condition: t('triggers.condition'),
                effect: t('triggers.effect'),
                executeOnce: t('triggers.executeOnce'),
                delay: t('triggers.delay'),
                disabled: t('triggers.disabled'),
              }}
            />
          )}

          {/* P1: Facilitator Tools */}
          {config.tools && (
            <GameDetailTools
              game={game}
              labels={{
                title: t('sections.tools'),
                description: t('tools.description'),
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
            {/* Unified Game Actions: Start Session + Like + Share + Add to Plan */}
            <GameActionsWithPlanModal
              gameId={game.id}
              gameName={game.title}
              playMode={game.playMode ?? undefined}
              initialReaction={initialReaction}
              likeCount={reactionCounts.likeCount}
              showShare={true}
              labels={{
                share: t('actions.share'),
              }}
            />

            {/* Admin: Edit game link */}
            {isAdmin && (
              <Link
                href={`/admin/games/builder?gameId=${game.id}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <PencilIcon className="h-4 w-4" />
                {t('actions.edit')}
              </Link>
            )}
          </GameDetailSidebar>
        )}

        {/* Sprint D: Metadata (sidebar-level, outside GameDetailSidebar) */}
        {config.metadata && (
          <GameDetailMetadata
            game={game}
            labels={{
              title: t('sections.metadata'),
              gameId: t('metadata.gameId'),
              created: t('metadata.created'),
              updated: t('metadata.updated'),
            }}
          />
        )}
      </div>

      {/* Related Games */}
      <GameDetailRelated
        games={relatedGames}
        labels={{ title: t('relatedGames') }}
      />
    </div>
  )
}
