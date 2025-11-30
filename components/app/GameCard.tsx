import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

type GameCardVariant = 'default' | 'compact' | 'featured'

interface GameCardProps {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  ageMin?: number | null
  ageMax?: number | null
  energyLevel?: 'low' | 'medium' | 'high' | null
  timeEstimate?: number | null
  minPlayers?: number | null
  maxPlayers?: number | null
  rating?: number | null
  playCount?: number | null
  isFavorite?: boolean
  variant?: GameCardVariant
  categories?: string[]
}

const energyConfig = {
  low: { label: 'Lugn', variant: 'success' as const },
  medium: { label: 'Mellan', variant: 'warning' as const },
  high: { label: 'Hög energi', variant: 'destructive' as const },
}

export function GameCard({
  id,
  name,
  description,
  imageUrl,
  ageMin,
  ageMax,
  energyLevel,
  timeEstimate,
  minPlayers,
  maxPlayers,
  rating,
  playCount,
  isFavorite = false,
  variant = 'default',
  categories = [],
}: GameCardProps) {
  const ageRange = ageMin && ageMax ? `${ageMin}-${ageMax} år` : ageMin ? `${ageMin}+ år` : null
  const playerRange = minPlayers && maxPlayers 
    ? `${minPlayers}-${maxPlayers} spelare` 
    : minPlayers 
      ? `${minPlayers}+ spelare` 
      : null

  if (variant === 'compact') {
    return (
      <Link href={`/app/games/${id}`} className="group block">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary hover:shadow-md">
          {/* Thumbnail */}
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">🎮</div>
            )}
          </div>
          
          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
              {name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {ageRange && <span>{ageRange}</span>}
              {timeEstimate && <span>• {timeEstimate} min</span>}
            </div>
          </div>

          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-yellow">★</span>
              <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </Link>
    )
  }

  if (variant === 'featured') {
    return (
      <Link href={`/app/games/${id}`} className="group block">
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-lg transition-all hover:shadow-xl">
          {/* Featured badge */}
          <div className="absolute left-4 top-4 z-10">
            <Badge variant="primary">⭐ Utvald</Badge>
          </div>
          
          {/* Favorite button */}
          <button 
            className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 backdrop-blur transition-colors hover:bg-background"
            onClick={(e) => { e.preventDefault(); /* Toggle favorite */ }}
          >
            <span className={isFavorite ? 'text-red-500' : 'text-muted-foreground'}>
              {isFavorite ? '❤️' : '🤍'}
            </span>
          </button>

          {/* Image */}
          <div className="aspect-[16/9] bg-gradient-to-br from-primary to-accent">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">🎮</div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-semibold text-foreground group-hover:text-primary">
              {name}
            </h3>
            {description && (
              <p className="mt-2 line-clamp-2 text-muted-foreground">{description}</p>
            )}
            
            {/* Categories */}
            {categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.slice(0, 3).map((cat) => (
                  <Badge key={cat} variant="outline" size="sm">{cat}</Badge>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {ageRange && <span>{ageRange}</span>}
                {timeEstimate && <span>{timeEstimate} min</span>}
                {playerRange && <span>{playerRange}</span>}
              </div>
              {rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow">★</span>
                  <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                  {playCount && <span className="text-xs text-muted-foreground">({playCount})</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Default variant
  return (
    <Link href={`/app/games/${id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary hover:shadow-md">
        {/* Favorite button */}
        <div className="relative">
          <button 
            className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 backdrop-blur transition-colors hover:bg-background"
            onClick={(e) => { e.preventDefault(); /* Toggle favorite */ }}
          >
            <span className={`text-sm ${isFavorite ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isFavorite ? '❤️' : '🤍'}
            </span>
          </button>

          {/* Image */}
          <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-accent/20">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">🎮</div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">
              {name}
            </h3>
            {rating && (
              <div className="flex items-center gap-0.5 text-sm">
                <span className="text-yellow">★</span>
                <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}

          {/* Tags */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ageRange && <Badge variant="primary" size="sm">{ageRange}</Badge>}
            {energyLevel && (
              <Badge variant={energyConfig[energyLevel].variant} size="sm">
                {energyConfig[energyLevel].label}
              </Badge>
            )}
            {timeEstimate && (
              <Badge variant="outline" size="sm">{timeEstimate} min</Badge>
            )}
          </div>

          {/* Bottom meta */}
          {(playerRange || playCount) && (
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              {playerRange && <span>{playerRange}</span>}
              {playCount && <span>{playCount} spelningar</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
