'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
import type { GameFormValues, GameWithRelations, ImportableGame, SelectOption } from './types';

type Filters = {
  search: string;
  status: 'all' | Database['public']['Enums']['game_status_enum'];
  energy: 'all' | Database['public']['Enums']['energy_level_enum'];
  playMode: 'all' | 'basic' | 'facilitated' | 'participants';
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
            <GameInfoDialog />
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
                  value={filters.playMode}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, playMode: event.target.value as Filters['playMode'] }));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'Alla spellägen' },
                    { value: 'basic', label: 'Enkel lek' },
                    { value: 'facilitated', label: 'Ledd aktivitet' },
                    { value: 'participants', label: 'Deltagarlek' },
                  ]}
                  placeholder="Spelläge"
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
                <li
                  key={game.id}
                  className="flex items-center justify-between gap-x-6 py-5 pl-3"
                  style={{ borderLeft: `4px solid ${playModeMeta(game.play_mode).color}` }}
                >
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
                        <Badge variant="outline" className="mt-0.5">
                          {playModeMeta(game.play_mode).label}
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
                        onClick={() => router.push(`/admin/games/${game.id}/edit`)}
                        className="hidden sm:flex"
                      >
                        <WrenchScrewdriverIcon className="mr-1.5 h-4 w-4" />
                        Builder
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="-m-2.5 block p-2.5 text-muted-foreground hover:text-foreground">
                          <span className="sr-only">Öppna meny</span>
                          <EllipsisVerticalIcon aria-hidden="true" className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => router.push(`/admin/games/${game.id}/edit`)}>
                            <PencilSquareIcon className="h-4 w-4" />
                            Redigera
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem 
                            onClick={() => router.push(`/admin/games/${game.id}/edit`)}
                            className="sm:hidden"
                          >
                            <WrenchScrewdriverIcon className="h-4 w-4" />
                            Builder
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handlePublishToggle(game, game.status === 'published' ? 'draft' : 'published')}
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
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            destructive
                            onClick={() => setDeleteTarget(game)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            Ta bort
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
        title="Ta bort lek?"
        description="Denna åtgärd kan inte ångras. Leken tas bort permanent."
        confirmLabel="Ta bort"
        variant="danger"
        onConfirm={() => (deleteTarget ? handleDelete(deleteTarget.id) : Promise.resolve())}
      />
    </AdminPageLayout>
  );
}

// Map play modes to consistent label and color for markers and badges
function playModeMeta(mode: GameWithRelations['play_mode']): { label: string; color: string } {
  switch (mode) {
    case 'facilitated':
      return { label: 'Ledd aktivitet', color: '#2563eb' };
    case 'participants':
      return { label: 'Deltagarlek', color: '#a855f7' };
    case 'basic':
    default:
      return { label: 'Enkel lek', color: '#10b981' };
  }
}

function GameInfoDialog() {
  const { activeTab, setActiveTab } = useTabs('modes');

  const infoTabs = getInfoTabs();

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
          Information
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Information om lekar</DialogTitle>
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

const CSV_HEADER =
  'game_key,name,short_description,description,play_mode,status,locale,energy_level,location_type,time_estimate_min,duration_max,min_players,max_players,players_recommended,age_min,age_max,difficulty,accessibility_notes,space_requirements,leader_tips,main_purpose_id,sub_purpose_ids,step_count,materials_json,phases_json,board_config_json,step_1_title,step_1_body,step_1_duration,step_2_title,step_2_body,step_2_duration,step_3_title,step_3_body,step_3_duration,step_4_title,step_4_body,step_4_duration';

const PURPOSE_MAIN_LIST = [
  ['72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54', 'Samarbete & Gemenskap'],
  ['c2043912-66d4-4143-8714-f5bb0b518acf', 'Motorik & Rörelse'],
  ['3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4', 'Kognition & Fokus'],
  ['59596e93-821d-4450-8e5e-4f214fed8168', 'Kreativitet & Uttryck'],
  ['93500ab9-6ff3-4a0b-bb0d-b9111486a364', 'Kommunikation & Språk'],
  ['704fe093-7b6f-45cf-ac38-c9ab2c6e5caa', 'Självutveckling & Emotionell Medvetenhet'],
  ['cb2533f4-51af-4add-929b-2747f6e43b81', 'Reflektion & Mindfulness'],
  ['fddf7912-4616-446b-b68a-6aa1679dd7de', 'Upptäckande & Äventyr'],
  ['2b83cedf-1f9d-4427-852f-ab781a2eeb51', 'Tävling & Motivation'],
  ['49a6cc94-52be-4a2e-92a6-55503b5988b6', 'Kunskap & Lärande'],
  ['577207e2-c07c-44f1-b107-53a24a842640', 'Tillgänglighet & Anpassning'],
  ['e1159589-f469-498b-81ff-b81888a1eab9', 'Digital interaktion'],
  ['a0ace276-0a17-4750-895b-6e14bfd2b3dd', 'Ledarskap & Ansvar'],
  ['badd2cd4-cb1f-4838-b932-029222566b2c', 'Tema & Stämning'],
];

const AI_PROMPT = `Du är lekredaktör för Lekbanken. Skapa EN (1) CSV-rad som kan importeras direkt.

CSV-header (måste följas exakt, samma ordning):
${CSV_HEADER}

KRAV:

game_key: slug-format, max 100 tecken, gärna suffix -001
name: 1–200 tecken
short_description: 1–500 tecken, 1–2 meningar
play_mode: basic | facilitated | participants
status: draft | published (default draft om osäkert)
locale: sv-SE om inget annat anges
main_purpose_id: MÅSTE vara ett giltigt UUID (jag kommer att ge dig det). Om du inte får ett giltigt UUID ska du sätta det tomt (null/blank cell) och skriva en varning efter CSV-raden.
sub_purpose_ids: JSON-array med UUID:er eller "[]"
step_count: 3–4
steps: skriv tydliga, testbara steg. Duration i SEKUNDER (heltal).
materials_json: JSON enligt format:
{"items":[...],"safety_notes":null|"...","preparation":null|"..."}

phases_json:
Om play_mode=facilitated eller participants: skapa 2–4 faser med rimlig timer och "timer_style" (countdown/elapsed/trafficlight)
Annars: lämna tomt

board_config_json:
Om play_mode=participants: fyll i en vettig konfig (show_game_name, show_current_phase, show_timer, show_participants, show_qr_code, theme, background_color, layout_variant, welcome_message)
Annars: lämna tomt

CSV-REGLER (viktigt):
All text med komma/radbrytning/citat måste omslutas av "..."
Citat inne i cell måste skrivas som "" (dubbla citattecken)
JSON ligger i en enda CSV-cell och måste därför också ha ""-escaping

INPUT DU FÅR AV MIG:
Tema:
Speltyp:
Ålder:
Antal spelare:
Tid:
Energinivå:
Plats:
main_purpose_id (UUID):
sub_purpose_ids (UUID-array eller tom):

OUTPUT:

Returnera EN (1) CSV-rad, inget annat.

Efter CSV-raden: lägg en kort “QA-checklist” i klartext (ej CSV) där du verifierar: play_mode, step_count, JSON valid, main_purpose_id format.`;

function getInfoTabs(): InfoTab[] {
  return [
    {
      id: 'modes',
      label: 'Spellägen',
      render: () => (
        <div className="space-y-3">
          <p className="font-semibold">Spellägen (play_mode)</p>
          <div className="space-y-2 text-muted-foreground">
            <p className="text-sm">Välj läge tidigt – QA, UI och runtime förväntar sig rätt struktur.</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li><strong>Enkel lek (basic):</strong> steg + material. Snabb att skapa/publicera. Ingen digital interaktion.</li>
              <li><strong>Ledd aktivitet (facilitated):</strong> steg + faser/timer. För workshops och momentstyrda övningar.</li>
              <li><strong>Deltagarlek (participants):</strong> steg + faser + roller + ev. publik tavla. För maffia/mysterium/hemliga roller.</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Krav per läge</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li><strong>basic:</strong> minst step_1_title + step_1_body.</li>
              <li><strong>facilitated:</strong> steg krävs, phases_json starkt rekommenderat.</li>
              <li><strong>participants:</strong> steg krävs; roles_json krävs för riktig participants-upplevelse. Saknas roller → byt till basic/facilitated.</li>
            </ul>
          </div>
          <div className="space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground">Praktiska tips</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>Testa från lekledarens enhet: basic/facilitated är enklast. participants kräver join-flöde + roller.</li>
              <li>
                roles_json i CSV: JSON-array i en cell, &quot;...&quot; runt, &quot;&quot; för citat. Minimikrav per roll: name,
                role_order, private_instructions, min_count.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'csv',
      label: 'CSV-fält',
      render: (copy) => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">CSV-format (Import v1.1, 2025-06-19)</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>UTF-8 (med/utan BOM), separator ,</li>
              <li>Celler med komma/radbrytning/citat omsluts av &quot;...&quot;; citat skrivs som &quot;&quot;</li>
              <li>En rad = en komplett lek (steg, material, ev. faser/roller/board)</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Obligatoriskt minimum</p>
            <p className="text-sm text-foreground">game_key, name, short_description, play_mode, step_1_title, step_1_body</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Viktig varning (syften)</p>
            <p className="text-sm text-foreground">main_purpose_id måste vara giltigt UUID från purposes i DB. Ogiltigt UUID → leken skapas men kan filtreras bort och “syns inte”.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">CSV-header (kopiera exakt)</p>
              <Button variant="ghost" size="sm" onClick={() => copy(CSV_HEADER)}>Kopiera</Button>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs font-mono break-all">
              {CSV_HEADER}
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Steg-regler</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>Ordning: 1 → 2 → 3 → 4</li>
              <li>Om step_N_title finns måste step_N_body finnas.</li>
              <li>Duration valfritt (sekunder).</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">JSON-kolumner</p>
            <p className="text-sm text-foreground">materials_json, phases_json, board_config_json är JSON i en cell och kräver &quot;&quot;-escaping.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'db',
      label: 'Supabase/databas',
      render: () => (
        <div className="space-y-3">
          <p className="font-semibold">Primära tabeller</p>
          <ul className="list-disc pl-5 space-y-1 text-foreground">
            <li>games – play_mode, status, locale, energy_level, location_type, time_estimate_min, min/max players, age_min/max, category, owner_tenant_id, main_purpose_id</li>
            <li>game_steps – steg/instruktioner</li>
            <li>game_materials – material/säkerhet/förberedelser (eller JSON-fält)</li>
            <li>game_phases – faser/rundor</li>
            <li>game_roles – roller</li>
            <li>game_board_config – publik tavla</li>
            <li>game_media – omslagsbild/standardbild</li>
            <li>game_secondary_purposes – undersyften</li>
          </ul>
          <p className="text-sm text-foreground">Relationer: games.id &rarr; respektive game_* tabell via game_id.</p>
          <p className="text-sm text-foreground">Syften: huvud/under från purposes (/api/purposes). Ogiltigt main_purpose_id är vanligaste import-felet.</p>
          <div className="space-y-1 text-sm text-foreground">
            <p className="font-semibold">Felsökning</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>“Importerad men syns inte”: kontrollera main_purpose_id mot purposes (giltigt UUID, ej soft-deleted).</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'extra',
      label: 'Extra info',
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">Syften</p>
            <p className="text-sm text-foreground">Hämtas från /api/purposes. main_purpose_id = main purpose, sub_purpose_ids = JSON-array av sub purposes.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Snabbreferens: Main Purpose ID:er</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground space-y-1">
              {PURPOSE_MAIN_LIST.map(([id, name]) => (
                <div key={id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{name}</span>
                  <span className="font-mono text-[11px] break-all text-muted-foreground">{id}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Standardbilder</p>
            <p className="text-sm text-foreground">Väljs via omslagsfältet eller via media-templates (/api/media/templates). Filnamn/namn måste matcha template-namn. Se media/standard assets i repo eller StandardImagesManager för källor.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Taxonomi / kategori</p>
            <p className="text-sm text-foreground">Spelkategori sparas i games.category och kan sättas i Buildern.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai',
      label: 'AI Prompt',
      render: (copy) => (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">AI Prompt (CSV-rad)</p>
            <Button variant="ghost" size="sm" onClick={() => copy(AI_PROMPT)}>Kopiera</Button>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap text-xs leading-5">{AI_PROMPT}</pre>
          </div>
          <p className="text-sm text-muted-foreground">Genererar en CSV-rad som matchar headern exakt. Efter raden: inkludera kort QA-checklista (play_mode, step_count, JSON, main_purpose_id-format).</p>
        </div>
      ),
    },
  ];
}
