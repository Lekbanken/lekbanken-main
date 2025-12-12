'use client';

import { useEffect, useMemo, useState } from "react";
import { PuzzlePieceIcon } from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminEmptyState,
  AdminErrorState,
  AdminCard,
  AdminStatGrid,
  AdminStatCard,
} from "@/components/admin/shared";
import { Input } from "@/components/ui";
import { searchGames, type Game } from "@/lib/services/gameService";

type Energy = Game["energy_level"] | "all";

export default function GamesAdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [energyFilter, setEnergyFilter] = useState<Energy>("all");

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const { games: data } = await searchGames({
          tenantId: null, // system/global view
          page: 1,
          pageSize: 50,
          status: "published",
        });
        setGames(data);
      } catch (err) {
        console.error(err);
        setError("Kunde inte ladda spelkatalogen.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return games.filter((g) => {
      if (energyFilter !== "all" && g.energy_level !== energyFilter) return false;
      if (!term) return true;
      return [g.name, g.description, g.category].some((v) => v?.toLowerCase().includes(term));
    });
  }, [games, search, energyFilter]);

  const stats = useMemo(() => {
    const total = games.length;
    const published = games.filter((g) => g.status === "published").length;
    const draft = games.filter((g) => g.status === "draft").length;
    return { total, published, draft };
  }, [games]);

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Spel (globalt)"
        description="Hantera spelkatalogen, kategorier och tillgänglighet."
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

      <AdminStatGrid className="mb-4">
        <AdminStatCard label="Totalt" value={stats.total} />
        <AdminStatCard label="Publicerade" value={stats.published} />
        <AdminStatCard label="Utkast" value={stats.draft} />
      </AdminStatGrid>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Sök på namn, kategori eller beskrivning"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
        <select
          value={energyFilter}
          onChange={(e) => setEnergyFilter(e.target.value as Energy)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Alla energinivåer</option>
          <option value="low">Låg</option>
          <option value="medium">Medel</option>
          <option value="high">Hög</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar spel...</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<PuzzlePieceIcon className="h-6 w-6" />}
          title="Inga spel"
          description="Inga spel matchar filtren just nu."
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
                {game.category || "Okänd kategori"} • {game.energy_level || "Nivå okänd"} •{" "}
                {game.status}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
