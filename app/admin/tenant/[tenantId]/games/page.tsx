 'use client';

import { useEffect, useMemo, useState } from "react";
import { PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState, AdminErrorState, AdminCard } from "@/components/admin/shared";
import { Input } from "@/components/ui";
import { useTenant } from "@/lib/context/TenantContext";
import { searchGames, type Game } from "@/lib/services/gameService";

export default function TenantGamesPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const { games: data } = await searchGames({
          tenantId,
          page: 1,
          pageSize: 30,
          status: "published",
        });
        setGames(data);
      } catch (err) {
        console.error(err);
        setError("Kunde inte ladda spel för organisationen.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [tenantId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return games;
    return games.filter((g) =>
      [g.name, g.description, g.category].some((v) => v?.toLowerCase().includes(term))
    );
  }, [games, search]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<PuzzlePieceIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj eller byt organisation för att se spel."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Spel"
        description="Välj vilka spel som ska vara tillgängliga för organisationen."
        icon={<PuzzlePieceIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda spel"
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Sök på namn eller kategori"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar spel...</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<PuzzlePieceIcon className="h-6 w-6" />}
          title="Inga spel"
          description="Inga spel hittades för denna organisation."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((game) => (
            <AdminCard
              key={game.id}
              title={game.name}
              description={game.description || "Ingen beskrivning"}
              icon={<PuzzlePieceIcon className="h-5 w-5 text-primary" />}
            >
              <p className="text-xs text-muted-foreground">
                {game.category || "Okänd kategori"} • {game.energy_level || "Nivå okänd"}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
