import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, BoltIcon, ClockIcon, UsersIcon, UserIcon } from '@heroicons/react/24/outline';
import { getGameById, getRelatedGames, type GameWithRelations } from '@/lib/services/games.server';

// Energinivå-konfiguration med dark mode stöd
const energyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: "Låg energi", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/50" },
  medium: { label: "Medel energi", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/50" },
  high: { label: "Hög energi", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/50" },
};

const localePriority = ['sv', 'no', 'en'];

function pickTranslation(game: GameWithRelations) {
  const translations = game.translations || [];
  for (const locale of localePriority) {
    const hit = translations.find((t) => t.locale === locale);
    if (hit) return hit;
  }
  return translations[0] || null;
}

export default async function GameDetailPage({ params }: { params: { gameId: string } }) {
  const game = await getGameById(params.gameId);
  const relatedGames = game ? await getRelatedGames(game, 4) : [];

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Leken hittades inte</h1>
          <Link
            href="/app/browse"
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Tillbaka till lekar
          </Link>
        </div>
      </div>
    );
  }

  const translation = pickTranslation(game);
  const displayTitle = translation?.title || game.name;
  const displayDescription = translation?.short_description || game.description || 'Ingen beskrivning tillgänglig';
  const displayInstructions = Array.isArray(translation?.instructions)
    ? (translation?.instructions as { title?: string; description?: string }[])
    : null;
  const energy = energyConfig[game.energy_level ?? 'medium'] ?? energyConfig.medium;
  const media = (game.media as unknown as any[]) ?? [];
  const cover = media.find((m) => m.kind === 'cover') ?? media[0];
  const gallery = media.filter((m) => m !== cover);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/app/browse"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Tillbaka till lekar
        </Link>
        
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mb-1">Lek</p>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{displayTitle}</h1>
        </div>

        {/* Cover image */}
        {cover?.media?.url && (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
            <div className="relative aspect-[16/9]">
              <Image
                src={cover.media.url}
                alt={cover.media.alt_text || displayTitle}
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {game.energy_level && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${energy.bgColor} ${energy.color}`}>
              <BoltIcon className="h-4 w-4" />
              {energy.label}
            </span>
          )}
          {game.main_purpose && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary">
              {game.main_purpose.name || 'Syfte'}
            </span>
          )}
          {game.product && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
              {game.product.name || 'Produkt'}
            </span>
          )}
          {game.age_min && game.age_max && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <UserIcon className="h-4 w-4" />
              {game.age_min}-{game.age_max} år
            </span>
          )}
          {game.min_players && game.max_players && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
              <UsersIcon className="h-4 w-4" />
              {game.min_players}-{game.max_players} deltagare
            </span>
          )}
          {game.time_estimate_min && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary">
              <ClockIcon className="h-4 w-4" />
              ~{game.time_estimate_min} min
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Om leken</h2>
            <p className="text-muted-foreground leading-relaxed">
              {displayDescription}
            </p>
          </section>

          {/* Instructions */}
          {displayInstructions && displayInstructions.length > 0 ? (
            <section className="rounded-2xl border border-border/60 bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Så spelar du</h2>
              <ol className="space-y-3 text-muted-foreground leading-relaxed">
                {displayInstructions.map((step, idx) => (
                  <li key={idx} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    {step.title && <p className="font-semibold text-foreground">{step.title}</p>}
                    {step.description && <p className="mt-1 whitespace-pre-wrap">{step.description}</p>}
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            game.instructions && (
              <section className="rounded-2xl border border-border/60 bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">Så spelar du</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {game.instructions}
                </div>
              </section>
            )
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Bilder</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gallery.map((item) => (
                  item.media?.url ? (
                    <div key={item.id} className="overflow-hidden rounded-xl border border-border/60 bg-muted">
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={item.media.url}
                          alt={item.media.alt_text || displayTitle}
                          fill
                          className="object-cover"
                          sizes="50vw"
                        />
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
            </section>
          )}

          {/* Game Details Grid */}
          <section className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Detaljer</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Antal deltagare
                </h3>
                <p className="text-xl font-bold text-foreground">
                  {game.min_players}-{game.max_players}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Tid
                </h3>
                <p className="text-xl font-bold text-foreground">
                  ~{game.time_estimate_min} min
                </p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Ålder
                </h3>
                <p className="text-xl font-bold text-foreground">
                  {game.age_min}-{game.age_max} år
                </p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Energinivå
                </h3>
                <p className={`text-xl font-bold ${energy.color}`}>
                  {energy.label}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Play Button */}
          <Link
            href={`/app/play/${game.id}`}
            className="block text-center w-full bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl text-lg transition shadow-sm"
          >
            Starta leken
          </Link>

          {/* Quick Info Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="text-base font-semibold text-foreground mb-3">Snabbinfo</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Status</p>
                <p className="text-foreground font-medium">
                  {game.status === 'published' ? '✓ Publicerad' : 'Utkast'}
                </p>
              </div>
              {game.created_at && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Tillagd</p>
                  <p className="text-foreground font-medium">
                    {new Date(game.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="text-base font-semibold text-foreground mb-3">Dela leken</h3>
            <div className="space-y-2">
              <button className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-4 rounded-lg transition">
                Dela
              </button>
              <button className="w-full bg-muted/50 hover:bg-muted text-foreground font-medium py-2.5 px-4 rounded-lg transition">
                Spara som favorit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Games */}
      {relatedGames.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Liknande lekar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedGames.map((relatedGame) => (
              <Link 
                key={relatedGame.id} 
                href={`/app/games/${relatedGame.id}`}
                className="block rounded-2xl border border-border/60 bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <h3 className="font-semibold text-foreground mb-1">{relatedGame.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{relatedGame.description}</p>
                {relatedGame.energy_level && (
                  <span className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${energyConfig[relatedGame.energy_level]?.bgColor} ${energyConfig[relatedGame.energy_level]?.color}`}>
                    <BoltIcon className="h-3 w-3" />
                    {energyConfig[relatedGame.energy_level]?.label}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
