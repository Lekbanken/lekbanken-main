'use client';

/**
 * GameCard Sandbox - Golden Reference
 *
 * Visar ALLA varianter och states av Unified GameCard.
 * Detta är den officiella referensen för hur GameCard ska se ut.
 *
 * @see GAMECARD_UNIFIED_IMPLEMENTATION.md
 * @see components/game/GameCard/
 * @see lib/game-display/
 */

import { useState } from 'react';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { GameCard, GameCardSkeleton } from '@/components/game/GameCard';
import type { GameCardVariant } from '@/components/game/GameCard';
import type { GameSummary, PlayMode, EnergyLevel } from '@/lib/game-display';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// MOCK DATA - GameSummary format (INTE råa DB-objekt)
// =============================================================================

// Note: coverUrl is null to demonstrate fallback state
// In production, images come from Supabase Storage via standardbilder mapping
const mockGames: GameSummary[] = [
  {
    id: '1',
    slug: 'rakna-spring',
    title: 'Räkna & Spring',
    shortDescription:
      'En aktiv matematiklek där barnen springer till rätt svar. Perfekt för att kombinera rörelse med lärande.',
    coverUrl: null, // Fallback: visar gradient + ikon
    ageMin: 6,
    ageMax: 10,
    energyLevel: 'high',
    durationMin: 10,
    durationMax: 20,
    minPlayers: 4,
    maxPlayers: 30,
    rating: 4.8,
    playCount: 1234,
    categories: ['Matematik', 'Rörelse', 'Utomhus'],
    playMode: 'basic',
    environment: 'outdoor',
    purpose: 'Matematik',
    status: 'published',
  },
  {
    id: '2',
    slug: 'ordstafett',
    title: 'Ordstafett',
    shortDescription: 'Lagstafett där varje deltagare ska hitta ord som börjar på en viss bokstav.',
    coverUrl: null,
    ageMin: 8,
    ageMax: 12,
    energyLevel: 'medium',
    durationMin: 15,
    durationMax: 25,
    minPlayers: 8,
    maxPlayers: 40,
    rating: 4.5,
    playCount: 892,
    categories: ['Svenska', 'Stafett'],
    playMode: 'facilitated',
    environment: 'indoor',
    purpose: 'Språk',
    status: 'published',
  },
  {
    id: '3',
    slug: 'mindfulness-runda',
    title: 'Mindfulness-runda',
    shortDescription:
      'Lugn aktivitet för att samla gruppen och skapa fokus. Bra som uppstart eller avslutning.',
    coverUrl: null,
    ageMin: 5,
    ageMax: 15,
    energyLevel: 'low',
    durationMin: 5,
    durationMax: 15,
    minPlayers: 1,
    maxPlayers: 30,
    rating: 4.2,
    playCount: 567,
    categories: ['Avslappning', 'Inomhus'],
    playMode: 'basic',
    environment: 'indoor',
    purpose: 'Välmående',
    status: 'published',
  },
  {
    id: '4',
    slug: 'kubb-turnering',
    title: 'Kubb-turnering',
    shortDescription: 'Klassiskt svenskt utomhusspel som tränar kastprecision och lagarbete.',
    coverUrl: null,
    ageMin: 8,
    ageMax: 99,
    energyLevel: 'medium',
    durationMin: 30,
    durationMax: 60,
    minPlayers: 4,
    maxPlayers: 12,
    rating: 4.9,
    playCount: 2341,
    isFavorite: true,
    categories: ['Utomhus', 'Lag', 'Klassiker'],
    playMode: 'participants',
    environment: 'outdoor',
    purpose: 'Samarbete',
    status: 'published',
  },
];

// Edge cases
const longTitleGame: GameSummary = {
  id: 'long-1',
  title:
    'En Mycket Lång Titel Som Testar Hur Kortet Hanterar Extremt Långa Namn På Aktiviteter Som Kan Förekomma',
  shortDescription: 'Kort beskrivning.',
  energyLevel: 'medium',
  playMode: 'basic',
  status: 'published',
};

const minimalGame: GameSummary = {
  id: 'minimal-1',
  title: 'Bara ett namn',
  status: 'published',
};

const noImageGame: GameSummary = {
  id: 'no-image-1',
  title: 'Lek utan bild',
  shortDescription: 'Denna lek har ingen omslagsbild och visar fallback.',
  energyLevel: 'high',
  durationMin: 10,
  durationMax: 20,
  playMode: 'facilitated',
  status: 'published',
};

const draftGame: GameSummary = {
  id: 'draft-1',
  title: 'Lek under arbete',
  shortDescription: 'Denna lek är ännu inte publicerad.',
  status: 'draft',
  energyLevel: 'low',
};

const lockedGame: GameSummary = {
  id: 'locked-1',
  title: 'Premium-lek',
  shortDescription: 'Kräver Pro-abonnemang för att låsa upp.',
  isLocked: true,
  product: 'Pro',
  energyLevel: 'high',
  playMode: 'participants',
  status: 'published',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SectionHeader({
  title,
  description,
  dataContract,
}: {
  title: string;
  description: string;
  dataContract?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {dataContract && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" size="sm">
            📦 Consumes
          </Badge>
          <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{dataContract}</code>
        </div>
      )}
    </div>
  );
}

function VariantDemo({
  variant,
  description,
  games,
  gridCols = 'grid-cols-1',
}: {
  variant: GameCardVariant;
  description: string;
  games: GameSummary[];
  gridCols?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">
            variant=&quot;{variant}&quot;
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">{variant}</Badge>
      </div>
      <div className={`grid gap-4 ${gridCols}`}>
        {games.map((game) => (
          <GameCard key={game.id} game={game} variant={variant} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function GameCardSandbox() {
  const [showSkeletons, setShowSkeletons] = useState(false);

  const variants: GameCardVariant[] = [
    'grid',
    'list',
    'compact',
    'picker',
    'block',
    'mini',
    'featured',
  ];

  return (
    <SandboxShell
      moduleId="app-game-card"
      title="🎮 Unified GameCard - Golden Reference"
      description="Alla varianter och states av den nya Unified GameCard komponenten"
    >
      <div className="mx-auto max-w-7xl space-y-16">
        {/* ================================================================= */}
        {/* SECTION A: VARIANTS MATRIX */}
        {/* ================================================================= */}
        <section>
          <SectionHeader
            title="A. Variants Matrix"
            description="Alla 7 varianter av GameCard. Varje variant är optimerad för sitt användningsfall."
            dataContract="GameSummary from lib/game-display/types.ts"
          />

          <div className="space-y-8">
            {/* Grid */}
            <VariantDemo
              variant="grid"
              description="Browse - kortvy (default). Visar bild, titel, beskrivning, badges."
              games={mockGames.slice(0, 4)}
              gridCols="sm:grid-cols-2 lg:grid-cols-4"
            />

            {/* List */}
            <VariantDemo
              variant="list"
              description="Browse - listvy. Horisontell layout med större bild."
              games={mockGames.slice(0, 2)}
              gridCols="grid-cols-1 lg:grid-cols-2"
            />

            {/* Compact */}
            <VariantDemo
              variant="compact"
              description="Sidebars, snabblänkar. Minimal höjd, fokus på titel."
              games={mockGames.slice(0, 3)}
              gridCols="grid-cols-1 max-w-md"
            />

            {/* Picker */}
            <VariantDemo
              variant="picker"
              description="Planner - välj lek. Klickbar för att lägga till i plan."
              games={mockGames.slice(0, 3)}
              gridCols="grid-cols-1 max-w-lg"
            />

            {/* Block */}
            <VariantDemo
              variant="block"
              description="Planner - blockrad. Med drag handle och actions."
              games={mockGames.slice(0, 2)}
              gridCols="grid-cols-1 max-w-2xl"
            />

            {/* Mini */}
            <VariantDemo
              variant="mini"
              description="Relaterade lekar. Kompakt utan bild."
              games={mockGames.slice(0, 4)}
              gridCols="sm:grid-cols-2 lg:grid-cols-4"
            />

            {/* Featured */}
            <VariantDemo
              variant="featured"
              description="Hero/kampanj. Stor med extra badges och meta."
              games={mockGames.slice(0, 2)}
              gridCols="grid-cols-1 lg:grid-cols-2"
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION B: STATES */}
        {/* ================================================================= */}
        <section>
          <SectionHeader
            title="B. States & Edge Cases"
            description="Hur GameCard hanterar olika data-states och edge cases."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Long title */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Lång titel (100+ tecken)</h3>
              <GameCard game={longTitleGame} variant="grid" />
            </div>

            {/* No image */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Ingen bild (fallback)</h3>
              <GameCard game={noImageGame} variant="grid" />
            </div>

            {/* Minimal data */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Minimal data</h3>
              <GameCard game={minimalGame} variant="grid" />
            </div>

            {/* Favorite */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Favorit</h3>
              <GameCard game={mockGames[3]} variant="grid" />
            </div>

            {/* Draft */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Draft (ej publicerad)</h3>
              <GameCard game={draftGame} variant="grid" />
            </div>

            {/* Locked */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Låst (kräver produkt)</h3>
              <GameCard game={lockedGame} variant="grid" />
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION C: PLAY MODES */}
        {/* ================================================================= */}
        <section>
          <SectionHeader
            title="C. PlayMode Variants"
            description="Hur olika PlayModes påverkar kortets styling."
          />

          <div className="grid gap-6 sm:grid-cols-3">
            {(['basic', 'facilitated', 'participants'] as PlayMode[]).map((mode) => {
              const game = mockGames.find((g) => g.playMode === mode) ?? mockGames[0];
              return (
                <div key={mode} className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">
                    playMode: &quot;{mode}&quot;
                  </h3>
                  <GameCard game={{ ...game, playMode: mode }} variant="grid" />
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION D: ENERGY LEVELS */}
        {/* ================================================================= */}
        <section>
          <SectionHeader
            title="D. Energy Levels"
            description="Hur olika energinivåer visas i badges."
          />

          <div className="grid gap-6 sm:grid-cols-3">
            {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => {
              const game = mockGames.find((g) => g.energyLevel === level) ?? mockGames[0];
              return (
                <div key={level} className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">
                    energyLevel: &quot;{level}&quot;
                  </h3>
                  <GameCard game={{ ...game, energyLevel: level }} variant="grid" />
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION E: SKELETONS */}
        {/* ================================================================= */}
        <section>
          <SectionHeader
            title="E. Loading States (Skeletons)"
            description="Skeleton-komponenter för varje variant."
          />

          <div className="mb-4">
            <button
              onClick={() => setShowSkeletons(!showSkeletons)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {showSkeletons ? 'Visa riktiga kort' : 'Visa skeletons'}
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {variants.map((variant) => (
              <div key={variant} className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">{variant}</h3>
                {showSkeletons ? (
                  <GameCardSkeleton variant={variant} />
                ) : (
                  <GameCard game={mockGames[0]} variant={variant} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION F: CODE EXAMPLES */}
        {/* ================================================================= */}
        <section>
          <SectionHeader
            title="F. Användning"
            description="Hur du importerar och använder Unified GameCard."
          />

          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-6 text-sm">
            {`// 1. Import
import { GameCard, GameCardSkeleton } from '@/components/game/GameCard';
import { mapDbGameToSummary } from '@/lib/game-display';

// 2. Mappa data till GameSummary
const summary = mapDbGameToSummary(dbGame);

// 3. Rendera
<GameCard game={summary} variant="grid" />
<GameCard game={summary} variant="list" />
<GameCard game={summary} variant="compact" />
<GameCard game={summary} variant="picker" actions={{ onAdd: handleAdd }} />
<GameCard game={summary} variant="block" actions={{ onRemove: handleRemove }} />
<GameCard game={summary} variant="mini" />
<GameCard game={summary} variant="featured" />

// Loading state
<GameCardSkeleton variant="grid" />

// Med custom flags
<GameCard 
  game={summary} 
  variant="grid" 
  flags={{ showFavorite: true, showRating: true }}
  actions={{ href: \`/app/games/\${summary.id}\`, onFavorite: handleFav }}
/>`}
          </pre>
        </section>

        {/* ================================================================= */}
        {/* SECTION G: DATA CONTRACT */}
        {/* ================================================================= */}
        <section>
          <SectionHeader
            title="G. Data Contract"
            description="GameSummary interface som GameCard konsumerar."
          />

          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-6 text-sm">
            {`// lib/game-display/types.ts

interface GameSummary {
  // Identifikation
  id: string;
  slug?: string;
  
  // Primär text
  title: string;
  shortDescription?: string;
  
  // Media
  coverUrl?: string | null;
  
  // Metadata (numerisk)
  durationMin?: number | null;
  durationMax?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  ageMin?: number | null;
  ageMax?: number | null;
  
  // Metadata (enum)
  energyLevel?: 'low' | 'medium' | 'high' | null;
  environment?: 'indoor' | 'outdoor' | 'both' | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  playMode?: 'basic' | 'facilitated' | 'participants' | null;
  
  // Kategorisering
  categories?: string[];
  purpose?: string | null;
  product?: string | null;
  
  // Statistik
  rating?: number | null;
  playCount?: number | null;
  
  // Användar-state
  isFavorite?: boolean;
  isLocked?: boolean;
  
  // Status
  status?: 'draft' | 'published' | 'archived';
}`}
          </pre>
        </section>

        {/* ================================================================= */}
        {/* NOTES */}
        {/* ================================================================= */}
        <section className="rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-foreground">📝 Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>7 varianter:</strong> grid, list, compact, picker, block, mini, featured
            </li>
            <li>
              <strong>Data:</strong> Tar emot <code className="rounded bg-muted px-1">GameSummary</code>{' '}
              - ALDRIG råa DB-objekt
            </li>
            <li>
              <strong>Formatters:</strong> Använder ENDAST{' '}
              <code className="rounded bg-muted px-1">lib/game-display/formatters.ts</code>
            </li>
            <li>
              <strong>Mappers:</strong> Använd{' '}
              <code className="rounded bg-muted px-1">mapDbGameToSummary()</code> för att konvertera
            </li>
            <li>
              <strong>PlayMode styling:</strong> basic (grå), facilitated (grön), participants (gul)
            </li>
            <li>
              <strong>Energy styling:</strong> low (blå), medium (gul), high (röd)
            </li>
          </ul>

          <div className="mt-6 flex gap-4 text-xs text-muted-foreground">
            <span>📁 components/game/GameCard/</span>
            <span>📁 lib/game-display/</span>
            <span>📄 GAMECARD_UNIFIED_IMPLEMENTATION.md</span>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Senast uppdaterad: 2026-01-29 (Unified GameCard v1.0)
          </p>
        </section>
      </div>
    </SandboxShell>
  );
}
