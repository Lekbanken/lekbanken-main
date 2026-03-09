import { GameCard } from '@/components/game/GameCard'
import { mapDbGameToSummary } from '@/lib/game-display'
import type { DbGame } from '@/lib/game-display'
import type { Tables } from '@/types/supabase'

type GameRow = Tables<'games'>

interface GameDetailRelatedProps {
  games: GameRow[]
  labels: {
    title: string
  }
}

export function GameDetailRelated({ games, labels }: GameDetailRelatedProps) {
  if (games.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-foreground mb-4">{labels.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {games.map((relatedGame) => {
          const summary = mapDbGameToSummary(relatedGame as unknown as DbGame)
          return (
            <GameCard
              key={relatedGame.id}
              game={summary}
              variant="mini"
              actions={{ href: `/app/games/${relatedGame.id}` }}
            />
          )
        })}
      </div>
    </section>
  )
}
