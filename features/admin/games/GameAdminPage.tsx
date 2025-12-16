'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
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
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, useToast } from '@/components/ui';
import { AdminConfirmDialog } from '@/components/admin/shared/AdminConfirmDialog';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type { Database } from '@/types/supabase';
import { GameImportDialog } from './components/GameImportDialog';
import { GameExportDialog } from './components/GameExportDialog';
import type { GameFormValues, GameWithRelations, ImportableGame, SelectOption } from './types';

type Filters = {
  search: string;
  status: 'all' | Database['public']['Enums']['game_status_enum'];
  energy: 'all' | Database['public']['Enums']['energy_level_enum'];
  tenant: 'all' | 'global' | string;
};

const PAGE_SIZE = 25;

function toGameFormPayload(values: GameFormValues) {
  return {
    name: values.name.trim(),
    short_description: values.short_description.trim(),
    description: values.description || null,
    main_purpose_id: values.main_purpose_id,
    product_id: values.product_id,
    owner_tenant_id: values.owner_tenant_id,
    category: values.category,
    energy_level: values.energy_level,
    location_type: values.location_type,
    time_estimate_min: values.time_estimate_min,
    min_players: values.min_players,
    max_players: values.max_players,
    age_min: values.age_min,
    age_max: values.age_max,
    status: values.status,
  };
}

export function GameAdminPage() {
  const { can } = useRbac();
  const { success, warning, info } = useToast();
  const router = useRouter();

  const [games, setGames] = useState<GameWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    energy: 'all',
    tenant: 'all',
  });
  const [tenants, setTenants] = useState<SelectOption[]>([]);
  const [purposes, setPurposes] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  // Legacy modal states removed
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameWithRelations | null>(null);
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
          body: JSON.stringify({ tenantId, page: 1, pageSize: 50, status: statusFilter }),
        }),
        fetch('/api/tenants'),
        fetch('/api/purposes'),
        fetch('/api/products'),
      ]);

      if (!gamesRes.ok) {
        const json = await gamesRes.json().catch(() => ({}));
        throw new Error(json.error || 'Kunde inte hämta spel');
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
      setTenants((tenantsJson.tenants || []).map((t) => ({ value: t.id, label: t.name || 'Namnlös organisation' })));
      setPurposes((purposesJson.purposes || []).map((p) => ({ value: p.id, label: p.name || 'Okänt syfte' })));
      setProducts((productsJson.products || []).map((p) => ({ value: p.id, label: p.name || 'Okänd produkt' })));
    } catch (err) {
      console.error('[admin/games] load error', err);
      setGames([]);
      setError('Kunde inte ladda spel just nu.');
    } finally {
      setIsLoading(false);
    }
  }, [canView, filters.status, filters.tenant]);

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
        warning(json.error || 'Publicering misslyckades');
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
        warning(json.error || 'Kunde inte återställa till utkast');
        return;
      }
    }
    setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, status: next } : g)));
    info(next === 'published' ? 'Publicerad' : 'Återställd till utkast');
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      warning(json.error || 'Kunde inte ta bort leken');
      return;
    }
    setGames((prev) => prev.filter((g) => g.id !== id));
    selection.clearSelection();
    warning('Leken togs bort.');
  };

  const handleImport = async (items: ImportableGame[]) => {
    // If items is empty, the import was done via CSV API - just reload the list
    if (items.length === 0) {
      await loadGames();
      success('Import klar! Spellistta uppdaterad.');
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
        failures.push(json.error || 'Okänt fel');
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
      success(`Importerade ${created.length} spel.`);
    }
    if (failures.length) {
      warning(`Misslyckades för ${failures.length} spel.`);
    }
  };

  const exportColumns: ExportColumn<GameWithRelations>[] = [
    { header: 'ID', accessor: 'id' },
    { header: 'Namn', accessor: 'name' },
    { header: 'Status', accessor: 'status' },
    { header: 'Kategori', accessor: (row) => row.category || '' },
    { header: 'Energi', accessor: (row) => row.energy_level || '' },
    { header: 'Syfte', accessor: (row) => row.main_purpose?.name || '' },
    { header: 'Organisation', accessor: (row) => row.owner?.name || 'Global' },
    { header: 'Min spelare', accessor: (row) => row.min_players ?? '' },
    { header: 'Max spelare', accessor: (row) => row.max_players ?? '' },
    { header: 'Tid (min)', accessor: (row) => row.time_estimate_min ?? '' },
  ];

  if (!canView) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<PuzzlePieceIcon className="h-6 w-6" />}
          title="Ingen åtkomst"
          description="Du behöver administratörsbehörighet för att hantera spel."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: 'Startsida', href: '/admin' }, { label: 'Spel' }]} />

      <AdminPageHeader
        title="Spel (globalt)"
        description="Navet för att skapa, uppdatera, publicera och exportera hela spelkatalogen."
        icon={<PuzzlePieceIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              CSV Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
              Importera
            </Button>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/games/new')}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Builder
                </Button>
              </div>
            )}
          </div>
        }
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda spel"
          description={error}
          onRetry={() => {
            setError(null);
            void loadGames();
          }}
        />
      )}

      <AdminStatGrid className="mb-4">
        <AdminStatCard label="Totalt" value={stats.total} />
        <AdminStatCard label="Publicerade" value={stats.published} />
        <AdminStatCard label="Utkast" value={stats.drafts} />
        <AdminStatCard label="Tenant-ägda" value={stats.tenantGames} />
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
              for (const item of items) {
                await handleDelete(item.id);
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
          <CardTitle>Spelöversikt</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <AdminTableToolbar
            searchValue={filters.search}
            onSearchChange={(val) => {
              setFilters((prev) => ({ ...prev, search: val }));
              setCurrentPage(1);
            }}
            searchPlaceholder="Sök på namn, syfte eller kategori"
            filters={
              <div className="flex flex-wrap gap-2">
                <Select
                  value={filters.status}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, status: event.target.value as Filters['status'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'Alla statusar' },
                    { value: 'published', label: 'Publicerade' },
                    { value: 'draft', label: 'Utkast' },
                  ]}
                  placeholder="Status"
                />
                <Select
                  value={filters.energy}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, energy: event.target.value as Filters['energy'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'Alla energinivåer' },
                    { value: 'low', label: 'Låg' },
                    { value: 'medium', label: 'Medel' },
                    { value: 'high', label: 'Hög' },
                  ]}
                  placeholder="Energi"
                />
                <Select
                  value={filters.tenant}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, tenant: event.target.value as Filters['tenant'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'Alla ägare' },
                    { value: 'global', label: 'Global' },
                    ...tenants,
                  ]}
                  placeholder="Ägare"
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
              title="Inga spel matchar filtren"
              description="Justera filter eller lägg till ett nytt spel."
            />
          ) : (
            <ul role="list" className="divide-y divide-border">
              {pageSlice.map((game) => (
                <li key={game.id} className="flex items-center justify-between gap-x-6 py-5">
                  {/* Checkbox */}
                  <div className="flex items-center gap-x-4">
                    <input
                      type="checkbox"
                      checked={selection.isSelected(game)}
                      onChange={() => selection.toggle(game)}
                      aria-label={`Välj ${game.name}`}
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
                          {game.status === 'published' ? 'Publicerad' : 'Utkast'}
                        </Badge>
                        {game.category && (
                          <Badge variant="outline" className="mt-0.5">
                            {game.category}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {game.short_description || game.description || 'Ingen beskrivning'}
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
                        <span>{game.owner?.name || 'Global'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-none items-center gap-x-4">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/games/${game.id}/builder`)}
                        className="hidden sm:flex"
                      >
                        <WrenchScrewdriverIcon className="mr-1.5 h-4 w-4" />
                        Builder
                      </Button>
                    )}
                    
                    <Menu as="div" className="relative flex-none">
                      <MenuButton className="-m-2.5 block p-2.5 text-muted-foreground hover:text-foreground">
                        <span className="sr-only">Öppna meny</span>
                        <EllipsisVerticalIcon aria-hidden="true" className="h-5 w-5" />
                      </MenuButton>
                      <MenuItems
                        transition
                        className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-popover py-2 shadow-lg ring-1 ring-border focus:outline-none transition data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[enter]:ease-out data-[leave]:duration-75 data-[leave]:ease-in"
                      >
                        {canEdit && (
                          <MenuItem>
                            <button
                              onClick={() => router.push(`/admin/games/${game.id}/edit`)}
                              className="flex w-full items-center gap-x-2 px-3 py-2 text-sm text-foreground data-[focus]:bg-muted"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                              Redigera
                            </button>
                          </MenuItem>
                        )}
                        {canEdit && (
                          <MenuItem>
                            <button
                              onClick={() => router.push(`/admin/games/${game.id}/builder`)}
                              className="flex w-full items-center gap-x-2 px-3 py-2 text-sm text-foreground data-[focus]:bg-muted sm:hidden"
                            >
                              <WrenchScrewdriverIcon className="h-4 w-4" />
                              Builder
                            </button>
                          </MenuItem>
                        )}
                        <MenuItem>
                          <button
                            onClick={() => handlePublishToggle(game, game.status === 'published' ? 'draft' : 'published')}
                            className="flex w-full items-center gap-x-2 px-3 py-2 text-sm text-foreground data-[focus]:bg-muted"
                          >
                            {game.status === 'published' ? (
                              <>
                                <XCircleIcon className="h-4 w-4" />
                                Gör till utkast
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="h-4 w-4" />
                                Publicera
                              </>
                            )}
                          </button>
                        </MenuItem>
                        {canEdit && (
                          <MenuItem>
                            <button
                              onClick={() => setDeleteTarget(game)}
                              className="flex w-full items-center gap-x-2 px-3 py-2 text-sm text-destructive data-[focus]:bg-muted"
                            >
                              <TrashIcon className="h-4 w-4" />
                              Ta bort
                            </button>
                          </MenuItem>
                        )}
                      </MenuItems>
                    </Menu>
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
        title="Ta bort lek?"
        description="Denna åtgärd kan inte ångras. Leken tas bort permanent."
        confirmLabel="Ta bort"
        variant="danger"
        onConfirm={() => (deleteTarget ? handleDelete(deleteTarget.id) : Promise.resolve())}
      />
    </AdminPageLayout>
  );
}
