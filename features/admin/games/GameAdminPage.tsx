'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  PuzzlePieceIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  ClockIcon,
  BoltIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminBulkActions,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminTableToolbar,
  AdminPagination,
  bulkActionPresets,
  useTableSelection,
} from '@/components/admin/shared';
import { 
  Badge, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Select, 
  useToast,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabPanel, useTabs } from '@/components/ui/tabs';
import { AdminConfirmDialog } from '@/components/admin/shared/AdminConfirmDialog';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type { Database } from '@/types/supabase';
import { GameImportDialog } from './components/GameImportDialog';
import { GameExportDialog } from './components/GameExportDialog';
import type { GameWithRelations, ImportableGame, SelectOption } from './types';
import { CANONICAL_CSV_HEADER, CANONICAL_CSV_JSON_COLUMNS, CANONICAL_CSV_SCOPE_NOTE } from './import-spec';
import {
  PROMPT_BASIC_CSV,
  PROMPT_FACILITATED_CSV,
  PROMPT_PARTICIPANTS_LIGHT_CSV,
  PROMPT_LEGENDARY_JSON,
} from './docs/prompts';

type Filters = {
  search: string;
  status: 'all' | Database['public']['Enums']['game_status_enum'];
  energy: 'all' | Database['public']['Enums']['energy_level_enum'];
  playMode: 'all' | 'basic' | 'facilitated' | 'participants';
  tenant: 'all' | 'global' | string;
};

const PAGE_SIZE = 25;

export function GameAdminPage() {
  const { can } = useRbac();
  const { success, warning, info } = useToast();
  const router = useRouter();
  const t = useTranslations('admin.games');
  const locale = useLocale();

  const [games, setGames] = useState<GameWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    energy: 'all',
    playMode: 'all',
    tenant: 'all',
  });
  const [tenants, setTenants] = useState<SelectOption[]>([]);
  const [purposes, setPurposes] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  // Legacy modal states removed
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameWithRelations | null>(null);
  const [activeSessionsWarning, setActiveSessionsWarning] = useState<{
    gameId: string;
    gameName: string;
    sessionCount: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const selection = useTableSelection<GameWithRelations>(games, 'id');

  const canView = can('admin.games.list');
  const canEdit = can('admin.games.edit');

  const loadGames = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setError(null);

    const statusFilter = filters.status === 'all' ? 'all' : filters.status;
    const tenantId = filters.tenant === 'all' ? null : filters.tenant === 'global' ? null : filters.tenant;

    try {
      const [gamesRes, tenantsRes, purposesRes, productsRes] = await Promise.all([
        fetch('/api/games/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, page: 1, pageSize: 50, status: statusFilter, locale }),
        }),
        fetch('/api/tenants'),
        fetch('/api/purposes'),
        fetch('/api/products'),
      ]);

      if (!gamesRes.ok) {
        const json = await gamesRes.json().catch(() => ({}));
        throw new Error(json.error || t('errors.fetchFailed'));
      }

      const gamesJson = (await gamesRes.json()) as { games?: GameWithRelations[] };
      const tenantsJson = tenantsRes.ok
        ? ((await tenantsRes.json()) as { tenants?: { id: string; name: string | null }[] })
        : { tenants: [] };
      const purposesJson = purposesRes.ok
        ? ((await purposesRes.json()) as { purposes?: { id: string; name: string | null }[] })
        : { purposes: [] };
      const productsJson = productsRes.ok
        ? ((await productsRes.json()) as { products?: { id: string; name: string | null }[] })
        : { products: [] };

      setGames(gamesJson.games || []);
      setTenants((tenantsJson.tenants || []).map((tenant) => ({ value: tenant.id, label: tenant.name || t('labels.unnamedOrganisation') })));
      setPurposes((purposesJson.purposes || []).map((p) => ({ value: p.id, label: p.name || t('labels.unknownPurpose') })));
      setProducts((productsJson.products || []).map((p) => ({ value: p.id, label: p.name || t('labels.unknownProduct') })));
    } catch (err) {
      console.error('[admin/games] load error', err);
      setGames([]);
      setError(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, filters.status, filters.tenant, t, locale]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await loadGames();
    })();
    return () => {
      active = false;
    };
  }, [loadGames]);

  const filteredGames = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return games
      .filter((g) => (filters.status === 'all' ? true : g.status === filters.status))
      .filter((g) => (filters.energy === 'all' ? true : g.energy_level === filters.energy))
      .filter((g) => (filters.playMode === 'all' ? true : (g.play_mode ?? 'basic') === filters.playMode))
      .filter((g) => {
        if (filters.tenant === 'all') return true;
        if (filters.tenant === 'global') return g.owner_tenant_id === null;
        return g.owner_tenant_id === filters.tenant;
      })
      .filter((g) => {
        if (!term) return true;
        return [g.name, g.description, g.short_description, g.category, g.owner?.name, g.main_purpose?.name]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(term));
      });
  }, [games, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
  const current = Math.min(currentPage, totalPages);
  const pageSlice = filteredGames.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = games.length;
    const published = games.filter((g) => g.status === 'published').length;
    const drafts = games.filter((g) => g.status === 'draft').length;
    const tenantGames = games.filter((g) => g.owner_tenant_id !== null).length;
    return { total, published, drafts, tenantGames };
  }, [games]);

  const handlePublishToggle = async (game: GameWithRelations, next: Database['public']['Enums']['game_status_enum']) => {
    if (next === 'published') {
      const res = await fetch(`/api/games/${game.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasCoverImage: true, force: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        warning(json.error || t('errors.publishFailed'));
        return;
      }
    } else {
      const res = await fetch(`/api/games/${game.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        warning(json.error || t('errors.draftFailed'));
        return;
      }
    }
    setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, status: next } : g)));
    info(next === 'published' ? t('messages.published') : t('messages.restoredToDraft'));
  };

  const handleDelete = async (id: string, options?: { silent?: boolean; force?: boolean }) => {
    const url = options?.force ? `/api/games/${id}?force=true` : `/api/games/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      
      // Handle active sessions conflict
      if (res.status === 409 && json.code === 'ACTIVE_SESSIONS') {
        const game = games.find(g => g.id === id);
        setActiveSessionsWarning({
          gameId: id,
          gameName: game?.name || 'Okänt spel',
          sessionCount: json.activeSessionCount || 0,
        });
        return false;
      }
      
      if (!options?.silent) {
        warning(json.error || t('errors.deleteFailed'));
      }
      return false;
    }
    setGames((prev) => prev.filter((g) => g.id !== id));
    if (!options?.silent) {
      selection.clearSelection();
      warning(t('messages.gameDeleted'));
    }
    return true;
  };

  const handleForceDelete = async () => {
    if (!activeSessionsWarning) return;
    
    const ok = await handleDelete(activeSessionsWarning.gameId, { force: true });
    if (ok) {
      warning(t('messages.gameDeletedWithSessions'));
    }
    setActiveSessionsWarning(null);
  };

  const handleImport = async (items: ImportableGame[]) => {
    // If items is empty, the import was done via CSV API - just reload the list
    if (items.length === 0) {
      await loadGames();
      success(t('messages.importComplete'));
      return;
    }

    const created: GameWithRelations[] = [];
    const failures: string[] = [];

    for (const item of items) {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          short_description: item.short_description,
          description: item.description || null,
          main_purpose_id: item.main_purpose_id,
          product_id: item.product_id || null,
          owner_tenant_id: item.owner_tenant_id || null,
          category: item.category || null,
          energy_level: item.energy_level || null,
          location_type: item.location_type || null,
          time_estimate_min: item.time_estimate_min ?? null,
          min_players: item.min_players ?? null,
          max_players: item.max_players ?? null,
          age_min: item.age_min ?? null,
          age_max: item.age_max ?? null,
          status: item.status || 'draft',
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        failures.push(json.error || t('errors.unknownError'));
        continue;
      }

      const { game } = (await res.json()) as { game: GameWithRelations };
      const owner = tenants.find((t) => t.value === game.owner_tenant_id);
      const purpose = purposes.find((p) => p.value === game.main_purpose_id);
      const product = products.find((p) => p.value === game.product_id);
      created.push({
        ...game,
        owner: owner ? { id: owner.value, name: owner.label } : null,
        main_purpose: purpose ? { id: purpose.value, name: purpose.label } : null,
        product: product ? { id: product.value, name: product.label } : null,
      });
    }

    if (created.length) {
      setGames((prev) => [...created, ...prev]);
      success(t('messages.importedGames', { count: created.length }));
    }
    if (failures.length) {
      warning(t('messages.importFailed', { count: failures.length }));
    }
  };

  if (!canView) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<PuzzlePieceIcon className="h-6 w-6" />}
          title={t('noAccess.title')}
          description={t('noAccess.description')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: t('breadcrumbs.home'), href: '/admin' }, { label: t('breadcrumbs.games') }]} />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<PuzzlePieceIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <GameInfoDialog />
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              {t('page.csvExport')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
              {t('page.import')}
            </Button>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/games/new')}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t('page.newInBuilder')}
                </Button>
              </div>
            )}
          </div>
        }
      />

      {error && (
        <AdminErrorState
          title={t('errors.loadTitle')}
          description={error}
          onRetry={() => {
            setError(null);
            void loadGames();
          }}
        />
      )}

      <AdminStatGrid className="mb-4">
        <AdminStatCard label={t('stats.total')} value={stats.total} />
        <AdminStatCard label={t('stats.published')} value={stats.published} />
        <AdminStatCard label={t('stats.drafts')} value={stats.drafts} />
        <AdminStatCard label={t('stats.tenantOwned')} value={stats.tenantGames} />
      </AdminStatGrid>

      {selection.selectedCount > 0 && (
        <AdminBulkActions
          selectedItems={selection.selectedItems}
          totalItems={games.length}
          onClearSelection={selection.clearSelection}
          onSelectAll={selection.selectAll}
          allSelected={selection.allSelected}
          actions={[
            bulkActionPresets.delete(async (items: GameWithRelations[]) => {
              let deleted = 0;
              for (const item of items) {
                const ok = await handleDelete(item.id, { silent: true });
                if (ok) deleted++;
              }
              if (deleted > 0) {
                warning(t('messages.gamesDeleted', { count: deleted }));
              }
            }),
            bulkActionPresets.activate(async (items: GameWithRelations[]) => {
              for (const item of items) {
                await handlePublishToggle(item, 'published');
              }
            }),
            bulkActionPresets.archive(async (items: GameWithRelations[]) => {
              for (const item of items) {
                await handlePublishToggle(item, 'draft');
              }
            }),
          ]}
          className="mb-4"
        />
      )}

      <Card className="mb-4 border border-border">
        <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
          <CardTitle>{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <AdminTableToolbar
            searchValue={filters.search}
            onSearchChange={(val) => {
              setFilters((prev) => ({ ...prev, search: val }));
              setCurrentPage(1);
            }}
            searchPlaceholder={t('searchPlaceholder')}
            filters={
              <div className="flex flex-wrap gap-2">
                <Select
                  value={filters.status}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, status: event.target.value as Filters['status'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: t('filters.allStatuses') },
                    { value: 'published', label: t('filters.published') },
                    { value: 'draft', label: t('filters.draft') },
                  ]}
                  placeholder={t('filters.status')}
                />
                <Select
                  value={filters.energy}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, energy: event.target.value as Filters['energy'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: t('filters.allEnergyLevels') },
                    { value: 'low', label: t('filters.low') },
                    { value: 'medium', label: t('filters.medium') },
                    { value: 'high', label: t('filters.high') },
                  ]}
                  placeholder={t('filters.energy')}
                />
                <Select
                  value={filters.playMode}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, playMode: event.target.value as Filters['playMode'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: t('filters.allPlayModes') },
                    { value: 'basic', label: t('filters.basicPlay') },
                    { value: 'facilitated', label: t('filters.facilitatedActivity') },
                    { value: 'participants', label: t('filters.participantPlay') },
                  ]}
                  placeholder={t('filters.playMode')}
                />
                <Select
                  value={filters.tenant}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, tenant: event.target.value as Filters['tenant'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: t('filters.allOwners') },
                    { value: 'global', label: t('filters.global') },
                    ...tenants,
                  ]}
                  placeholder={t('filters.owner')}
                />
              </div>
            }
          />

          {/* Game List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : pageSlice.length === 0 ? (
            <AdminEmptyState
              icon={<PuzzlePieceIcon className="h-6 w-6" />}
              title={t('noGames.title')}
              description={t('noGames.description')}
            />
          ) : (
            <ul role="list" className="divide-y divide-border">
              {pageSlice.map((game) => (
                <li
                  key={game.id}
                  className="flex items-center justify-between gap-x-6 py-5 pl-3"
                  style={{ borderLeft: `4px solid ${getPlayModeMeta(game.play_mode, t).color}` }}
                >
                  {/* Checkbox */}
                  <div className="flex items-center gap-x-4">
                    <input
                      type="checkbox"
                      checked={selection.isSelected(game)}
                      onChange={() => selection.toggle(game)}
                      aria-label={t('list.selectGame', { name: game.name })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    
                    {/* Game info */}
                    <div className="min-w-0 flex-auto">
                      <div className="flex items-start gap-x-3">
                        <p className="text-sm font-semibold text-foreground">{game.name}</p>
                        <Badge 
                          variant={game.status === 'published' ? 'success' : 'secondary'}
                          className="mt-0.5"
                        >
                          {game.status === 'published' ? t('filters.published') : t('filters.draft')}
                        </Badge>
                        <Badge variant="outline" className="mt-0.5">
                          {getPlayModeMeta(game.play_mode, t).label}
                        </Badge>
                        {game.category && (
                          <Badge variant="outline" className="mt-0.5">
                            {game.category}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {game.short_description || game.description || t('labels.noDescription')}
                      </p>
                      <div className="mt-2 flex items-center gap-x-4 text-xs text-muted-foreground">
                        {game.min_players && (
                          <div className="flex items-center gap-x-1">
                            <UserGroupIcon className="h-4 w-4" />
                            <span>{game.min_players} - {game.max_players ?? '?'}</span>
                          </div>
                        )}
                        {game.time_estimate_min && (
                          <div className="flex items-center gap-x-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>{game.time_estimate_min} min</span>
                          </div>
                        )}
                        {game.energy_level && (
                          <div className="flex items-center gap-x-1">
                            <BoltIcon className="h-4 w-4" />
                            <span className="capitalize">{game.energy_level}</span>
                          </div>
                        )}
                        <span className="text-muted-foreground/60">•</span>
                        <span>{game.owner?.name || t('filters.global')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-none items-center gap-x-4">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/games/${game.id}/edit`)}
                        className="hidden sm:flex"
                      >
                        <WrenchScrewdriverIcon className="mr-1.5 h-4 w-4" />
                        {t('page.openInBuilder')}
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="-m-2.5 block p-2.5 text-muted-foreground hover:text-foreground">
                          <span className="sr-only">{t('list.openMenu')}</span>
                          <EllipsisVerticalIcon aria-hidden="true" className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => router.push(`/admin/games/${game.id}/edit`)}>
                            <PencilSquareIcon className="h-4 w-4" />
                            {t('actions.edit')}
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem 
                            onClick={() => router.push(`/admin/games/${game.id}/edit`)}
                            className="sm:hidden"
                          >
                            <WrenchScrewdriverIcon className="h-4 w-4" />
                            {t('page.openInBuilder')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handlePublishToggle(game, game.status === 'published' ? 'draft' : 'published')}
                        >
                          {game.status === 'published' ? (
                            <>
                              <XCircleIcon className="h-4 w-4" />
                              {t('actions.makeDraft')}
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              {t('actions.publish')}
                            </>
                          )}
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            destructive
                            onClick={() => setDeleteTarget(game)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <AdminPagination
            currentPage={current}
            totalPages={totalPages}
            totalItems={filteredGames.length}
            itemsPerPage={PAGE_SIZE}
            onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
          />
        </CardContent>
      </Card>

      <GameImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      <GameExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        selectedIds={selection.selectedItems.map((g) => g.id)}
        totalCount={games.length}
      />

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description')}
        confirmLabel={t('actions.delete')}
        variant="danger"
        onConfirm={async () => { if (deleteTarget) await handleDelete(deleteTarget.id); }}
      />

      <AdminConfirmDialog
        open={Boolean(activeSessionsWarning)}
        onOpenChange={(open) => !open && setActiveSessionsWarning(null)}
        title={t('activeSessionsDialog.title')}
        description={t('activeSessionsDialog.description', {
          gameName: activeSessionsWarning?.gameName || '',
          count: activeSessionsWarning?.sessionCount || 0,
        })}
        confirmLabel={t('activeSessionsDialog.confirmLabel')}
        variant="danger"
        onConfirm={handleForceDelete}
      />
    </AdminPageLayout>
  );
}

// Map play modes to consistent label and color for markers and badges
function getPlayModeMeta(mode: GameWithRelations['play_mode'], t: ReturnType<typeof useTranslations<'admin.games'>>): { label: string; color: string } {
  switch (mode) {
    case 'facilitated':
      return { label: t('playModes.facilitated'), color: '#2563eb' };
    case 'participants':
      return { label: t('playModes.participants'), color: '#a855f7' };
    case 'basic':
    default:
      return { label: t('playModes.basic'), color: '#10b981' };
  }
}

function GameInfoDialog() {
  const t = useTranslations('admin.games');
  const { activeTab, setActiveTab } = useTabs('overview');

  const infoTabs = getInfoTabs(t);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <InformationCircleIcon className="mr-2 h-4 w-4" />
          {t('import.infoDialogTitle')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('import.infoDialogTitle')}</DialogTitle>
        </DialogHeader>
        <Tabs
          tabs={infoTabs.map((t) => ({ id: t.id, label: t.label }))}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="mb-4"
        />
        {infoTabs.map((tab) => (
          <TabPanel key={tab.id} id={tab.id} activeTab={activeTab} className="space-y-4 text-sm leading-6 text-foreground">
            {tab.render(handleCopy)}
          </TabPanel>
        ))}
      </DialogContent>
    </Dialog>
  );
}

type InfoTab = {
  id: string;
  label: string;
  render: (copy: (text: string) => void) => ReactNode;
};

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <pre className="whitespace-pre-wrap break-words text-xs leading-5">{children}</pre>
    </div>
  );
}

function CopyHeaderRow({ label, value, copy, copyLabel }: { label: string; value: string; copy: (text: string) => void; copyLabel: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{label}</p>
        <Button variant="ghost" size="sm" onClick={() => copy(value)}>
          {copyLabel}
        </Button>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs font-mono break-all">
        {value}
      </div>
    </div>
  );
}

function AiPromptsTab({ copy }: { copy: (text: string) => void }) {
  const t = useTranslations('admin.games.import');
  const [selected, setSelected] = useState<'basic' | 'facilitated' | 'participants-light' | 'legendary'>('basic');

  const prompt =
    selected === 'basic'
      ? PROMPT_BASIC_CSV
      : selected === 'facilitated'
        ? PROMPT_FACILITATED_CSV
        : selected === 'participants-light'
          ? PROMPT_PARTICIPANTS_LIGHT_CSV
          : PROMPT_LEGENDARY_JSON;

  const titleLabels: Record<string, string> = {
    basic: 'Basic (CSV)',
    facilitated: 'Facilitated (CSV)',
    'participants-light': 'Participants Light (CSV)',
    legendary: 'Legendary (JSON)',
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-semibold">{t('selectPrompt')}</p>
        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('artifactsOrTriggers') }} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={selected === 'basic' ? 'default' : 'outline'} size="sm" onClick={() => setSelected('basic')}>
          Basic (CSV)
        </Button>
        <Button
          variant={selected === 'facilitated' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('facilitated')}
        >
          Facilitated (CSV)
        </Button>
        <Button
          variant={selected === 'participants-light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('participants-light')}
        >
          Participants Light (CSV)
        </Button>
        <Button
          variant={selected === 'legendary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('legendary')}
        >
          Legendary (JSON)
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-semibold">{titleLabels[selected]}</p>
        <Button variant="ghost" size="sm" onClick={() => copy(prompt)}>
          {t('copy')}
        </Button>
      </div>

      <CodeBlock>{prompt}</CodeBlock>
    </div>
  );
}

function getInfoTabs(t: ReturnType<typeof useTranslations<'admin.games'>>): InfoTab[] {
  const minimalJsonExample = `[
  {
    "game_key": "mysteriet-001",
    "name": "Mysteriet",
    "short_description": "En deltagarlek med roller.",
    "description": "...",
    "play_mode": "participants",
    "status": "draft",
    "locale": "sv-SE",
    "steps": [
      { "step_order": 1, "title": "Start", "body": "...", "duration_seconds": 120, "leader_script": "..." }
    ],
    "phases": [
      { "phase_order": 1, "name": "Intro", "phase_type": "intro", "duration_seconds": 300, "timer_visible": true, "timer_style": "countdown", "description": null, "board_message": null, "auto_advance": false }
    ],
    "roles": [
      { "role_order": 1, "name": "Spion", "icon": null, "color": null, "public_description": null, "private_instructions": "...", "private_hints": null, "min_count": 1, "max_count": null, "assignment_strategy": "random", "scaling_rules": null, "conflicts_with": [] }
    ],
    "boardConfig": null,
    "artifacts": [],
    "triggers": []
  }
]`;

  return [
    {
      id: 'overview',
      label: t('import.overviewTab'),
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">{t('import.whatImportDoes')}</p>
            <p className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: t('import.importCanRead') }} />
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('import.csvVsJson')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li dangerouslySetInnerHTML={{ __html: t('import.csvBasic') }} />
              <li dangerouslySetInnerHTML={{ __html: t('import.jsonLegendary') }} />
            </ul>
            <p className="text-sm text-muted-foreground">{CANONICAL_CSV_SCOPE_NOTE}</p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('import.startHere')}</p>
            <ol className="list-decimal pl-5 space-y-1 text-foreground">
              <li>{t('import.step1')}</li>
              <li>{t('import.step2')}</li>
              <li>{t('import.step3')}</li>
            </ol>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('import.commonErrors')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li dangerouslySetInnerHTML={{ __html: t('import.invalidPurpose') }} />
              <li dangerouslySetInnerHTML={{ __html: t('import.jsonEscaping') }} />
              <li dangerouslySetInnerHTML={{ __html: t('import.missingSteps') }} />
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'modes',
      label: t('import.playModesTab'),
      render: () => (
        <div className="space-y-3">
          <p className="font-semibold">{t('import.playModes')}</p>
          <div className="space-y-2 text-muted-foreground">
            <p className="text-sm">{t('import.chooseEarly')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li dangerouslySetInnerHTML={{ __html: t('import.basicMode') }} />
              <li dangerouslySetInnerHTML={{ __html: t('import.facilitatedMode') }} />
              <li dangerouslySetInnerHTML={{ __html: t('import.participantsMode') }} />
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">{t('import.minimumRequired')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li dangerouslySetInnerHTML={{ __html: t('import.basicReq') }} />
              <li dangerouslySetInnerHTML={{ __html: t('import.facilitatedReq') }} />
              <li dangerouslySetInnerHTML={{ __html: t('import.participantsReq') }} />
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'csv',
      label: t('import.csvTab'),
      render: (copy) => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">{t('import.csvFormat')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t('import.csvFormatList1')}</li>
              <li>{t('import.csvFormatList2')}</li>
              <li>{t('import.csvFormatList3')}</li>
            </ul>
          </div>

          <CopyHeaderRow label={t('import.canonicalCsvHeader')} value={CANONICAL_CSV_HEADER} copy={copy} copyLabel={t('import.copy')} />

          <div className="space-y-1">
            <p className="font-semibold">{t('import.jsonColumnsInCsv')}</p>
            <p className="text-sm text-foreground">{CANONICAL_CSV_JSON_COLUMNS.join(', ')}</p>
            <p className="text-sm text-muted-foreground">{t('import.useJsonForArtifacts')}</p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('import.commonMistakes')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t('import.invalidJsonInColumn')}</li>
              <li>{t('import.stepTitleWithoutBody')}</li>
              <li>{t('import.invalidUuid')}</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'json',
      label: t('import.jsonTab'),
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">{t('import.jsonImportFull')}</p>
            <p className="text-sm text-foreground">{t('import.jsonLegendaryDesc')}</p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">{t('import.minimalJson')}</p>
            <CodeBlock>{minimalJsonExample}</CodeBlock>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('import.orderResolution')}</p>
            <p className="text-sm text-foreground">{t('import.orderResolutionDesc')}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai',
      label: t('import.aiPromptsTab'),
      render: (copy) => <AiPromptsTab copy={copy} />,
    },
  ];
}
