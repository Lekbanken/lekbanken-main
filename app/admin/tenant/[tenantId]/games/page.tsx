 'use client';

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
import { PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState, AdminErrorState, AdminCard } from "@/components/admin/shared";
import { Input } from "@/components/ui";
import { useTenant } from "@/lib/context/TenantContext";
import { searchGames, type Game } from "@/lib/services/gameService";

export default function TenantGamesPage() {
  const t = useTranslations('admin.tenant.games');
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
        setError(t('errorDescription'));
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
          title={t('noOrganizationTitle')}
          description={t('noOrganizationDescription')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<PuzzlePieceIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title={t('errorTitle')}
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<PuzzlePieceIcon className="h-6 w-6" />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((game) => (
            <AdminCard
              key={game.id}
              title={game.name}
              description={game.description || t('noDescription')}
              icon={<PuzzlePieceIcon className="h-5 w-5 text-primary" />}
            >
              <p className="text-xs text-muted-foreground">
                {game.category || t('unknownCategory')} • {game.energy_level || t('unknownLevel')}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
