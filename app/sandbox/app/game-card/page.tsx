'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { GameCard } from '@/components/app/GameCard'

const mockGames = [
  {
    id: '1',
    name: 'Räkna & Spring',
    description: 'En aktiv matematiklek där barnen springer till rätt svar. Perfekt för att kombinera rörelse med lärande.',
    ageMin: 6,
    ageMax: 10,
    energyLevel: 'high' as const,
    timeEstimate: 15,
    minPlayers: 4,
    maxPlayers: 30,
    rating: 4.8,
    playCount: 1234,
    categories: ['Matematik', 'Rörelse', 'Utomhus'],
  },
  {
    id: '2',
    name: 'Ordstafett',
    description: 'Lagstafett där varje deltagare ska hitta ord som börjar på en viss bokstav.',
    ageMin: 8,
    ageMax: 12,
    energyLevel: 'medium' as const,
    timeEstimate: 20,
    minPlayers: 8,
    maxPlayers: 40,
    rating: 4.5,
    playCount: 892,
    categories: ['Svenska', 'Stafett'],
  },
  {
    id: '3',
    name: 'Mindfulness-runda',
    description: 'Lugn aktivitet för att samla gruppen och skapa fokus. Bra som uppstart eller avslutning.',
    ageMin: 5,
    ageMax: 15,
    energyLevel: 'low' as const,
    timeEstimate: 10,
    minPlayers: 1,
    maxPlayers: 30,
    rating: 4.2,
    playCount: 567,
    categories: ['Avslappning', 'Inomhus'],
  },
  {
    id: '4',
    name: 'Kubb-turnering',
    description: 'Klassiskt svenskt utomhusspel som tränar kastprecision och lagarbete.',
    ageMin: 8,
    ageMax: 99,
    energyLevel: 'medium' as const,
    timeEstimate: 45,
    minPlayers: 4,
    maxPlayers: 12,
    rating: 4.9,
    playCount: 2341,
    isFavorite: true,
    categories: ['Utomhus', 'Lag', 'Klassiker'],
  },
]

export default function GameCardSandbox() {
  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/sandbox/app" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Game Card</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-6xl space-y-12">
          {/* Default variant */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Default Variant</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Standardkortet för listor och grid. Visar namn, beskrivning, betyg och metadata.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {mockGames.map((game) => (
                <GameCard key={game.id} {...game} />
              ))}
            </div>
          </section>

          {/* Compact variant */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Compact Variant</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Kompakt vy för listor, sökresultat och sidofält.
            </p>
            <div className="max-w-md space-y-3">
              {mockGames.slice(0, 3).map((game) => (
                <GameCard key={game.id} {...game} variant="compact" />
              ))}
            </div>
          </section>

          {/* Featured variant */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Featured Variant</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Större kort för utvalda aktiviteter, hero-sektioner och kampanjer.
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              {mockGames.slice(0, 2).map((game) => (
                <GameCard key={game.id} {...game} variant="featured" />
              ))}
            </div>
          </section>

          {/* States */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">States</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Med favorit</h3>
                <GameCard {...mockGames[3]} isFavorite={true} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Utan beskrivning</h3>
                <GameCard 
                  id="5" 
                  name="Snabb aktivitet" 
                  ageMin={6} 
                  ageMax={12}
                  energyLevel="high"
                  timeEstimate={5}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Minimal data</h3>
                <GameCard id="6" name="Bara ett namn" />
              </div>
            </div>
          </section>

          {/* Code example */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Användning</h2>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`import { GameCard } from '@/components/app/GameCard'

// Default
<GameCard
  id="1"
  name="Räkna & Spring"
  description="En aktiv matematiklek..."
  ageMin={6}
  ageMax={10}
  energyLevel="high"
  timeEstimate={15}
  rating={4.8}
  playCount={1234}
/>

// Compact (för listor)
<GameCard {...game} variant="compact" />

// Featured (för hero)
<GameCard {...game} variant="featured" />`}
            </pre>
          </section>

          {/* Notes */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
            <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>3 varianter: default, compact, featured</li>
              <li>Energinivå: low (blå), medium (gul), high (röd)</li>
              <li>Ålder, tid, rating visas som badges</li>
              <li>Hover-effekt med <code className="rounded bg-muted px-1">hover:border-primary</code></li>
            </ul>

            <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
          </section>
        </div>
      </div>
    </div>
  )
}
