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
  const { activeTab, setActiveTab } = useTabs('overview');

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

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <pre className="whitespace-pre-wrap break-words text-xs leading-5">{children}</pre>
    </div>
  );
}

function CopyHeaderRow({ label, value, copy }: { label: string; value: string; copy: (text: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{label}</p>
        <Button variant="ghost" size="sm" onClick={() => copy(value)}>
          Kopiera
        </Button>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs font-mono break-all">
        {value}
      </div>
    </div>
  );
}

function AiPromptsTab({ copy }: { copy: (text: string) => void }) {
  const [selected, setSelected] = useState<'basic' | 'facilitated' | 'participants-light' | 'legendary'>('basic');

  const prompt =
    selected === 'basic'
      ? PROMPT_BASIC_CSV
      : selected === 'facilitated'
        ? PROMPT_FACILITATED_CSV
        : selected === 'participants-light'
          ? PROMPT_PARTICIPANTS_LIGHT_CSV
          : PROMPT_LEGENDARY_JSON;

  const title =
    selected === 'basic'
      ? 'Basic (CSV)'
      : selected === 'facilitated'
        ? 'Facilitated (CSV)'
        : selected === 'participants-light'
          ? 'Participants Light (CSV)'
          : 'Legendary (JSON)';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-semibold">Välj prompt</p>
        <p className="text-sm text-muted-foreground">
          Behöver du artifacts eller triggers? Välj <strong>Legendary (JSON)</strong>.
        </p>
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
        <p className="font-semibold">{title}</p>
        <Button variant="ghost" size="sm" onClick={() => copy(prompt)}>
          Kopiera
        </Button>
      </div>

      <CodeBlock>{prompt}</CodeBlock>
    </div>
  );
}

function getInfoTabs(): InfoTab[] {
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
      label: 'Översikt',
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">Vad importen gör</p>
            <p className="text-sm text-foreground">
              Importen kan läsa <strong>CSV</strong> (bulk/massimport) och <strong>JSON</strong> (full fidelity).
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">CSV vs JSON</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>
                <strong>CSV:</strong> basic/facilitated + participants-light inom canonical header.
              </li>
              <li>
                <strong>JSON:</strong> Legendary/escape-room (artifacts + triggers + avancerade step-fält).
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">{CANONICAL_CSV_SCOPE_NOTE}</p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Start här (3 steg)</p>
            <ol className="list-decimal pl-5 space-y-1 text-foreground">
              <li>Välj spelläge (basic/facilitated/participants).</li>
              <li>Välj format: CSV (enkelt/bulk) eller JSON (Legendary/full fidelity).</li>
              <li>Validera i Import-dialogen (dry-run) innan import.</li>
            </ol>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Vanliga fel</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>
                <strong>Ogiltigt purpose-id:</strong> main_purpose_id/sub_purpose_ids måste vara riktiga UUID från databasen.
              </li>
              <li>
                <strong>JSON escaping i CSV:</strong> citat i JSON måste skrivas som <code>{'""'}</code> i CSV-cellen.
              </li>
              <li>
                <strong>Saknade steg:</strong> om step_N_title finns måste step_N_body finnas.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'modes',
      label: 'Spellägen',
      render: () => (
        <div className="space-y-3">
          <p className="font-semibold">Spellägen (play_mode)</p>
          <div className="space-y-2 text-muted-foreground">
            <p className="text-sm">Välj läge tidigt – QA, UI och runtime förväntar sig rätt struktur.</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li><strong>Enkel lek (basic):</strong> steg + material. Ingen digital interaktion.</li>
              <li><strong>Ledd aktivitet (facilitated):</strong> steg + faser/timer, ev. publik tavla.</li>
              <li>
                <strong>Deltagarlek (participants):</strong> steg + faser + roller + ev. publik tavla. För Legendary (artifacts/triggers)
                ska du använda JSON-import.
              </li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Minimum required</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li><strong>basic:</strong> minst step_1_title + step_1_body.</li>
              <li><strong>facilitated:</strong> steg krävs; phases_json starkt rekommenderat.</li>
              <li><strong>participants:</strong> steg krävs; roles_json rekommenderas starkt.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'csv',
      label: 'CSV',
      render: (copy) => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">CSV-format (canonical)</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>UTF-8 (med/utan BOM), separator ,</li>
              <li>Celler med komma/radbrytning/citat omsluts av &quot;...&quot;; citat skrivs som &quot;&quot;</li>
              <li>En rad = en lek</li>
            </ul>
          </div>

          <CopyHeaderRow label="Canonical CSV-header (kopiera exakt)" value={CANONICAL_CSV_HEADER} copy={copy} />

          <div className="space-y-1">
            <p className="font-semibold">JSON-kolumner som stöds i CSV</p>
            <p className="text-sm text-foreground">{CANONICAL_CSV_JSON_COLUMNS.join(', ')}</p>
            <p className="text-sm text-muted-foreground">
              Vill du använda artifacts eller triggers? CSV-kontraktet innehåller inte det. Välj JSON-import (Legendary).
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Vanligaste felen</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>Ogiltig JSON i JSON-kolumn (oftast fel citat/escaping).</li>
              <li>step_N_title ifyllt men step_N_body saknas.</li>
              <li>main_purpose_id/sub_purpose_ids är inte giltiga UUID.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'json',
      label: 'JSON',
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">JSON-import (full fidelity)</p>
            <p className="text-sm text-foreground">
              JSON är formatet för Legendary/escape-room: artifacts + triggers + avancerade step-fält.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">Minimal JSON (1 lek)</p>
            <CodeBlock>{minimalJsonExample}</CodeBlock>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Order-resolution i triggers</p>
            <p className="text-sm text-foreground">
              Triggers kan referera till <code>stepOrder</code>/<code>phaseOrder</code>/<code>artifactOrder</code> i condition/actions.
              Importen resolverar det till faktiska ID:n.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai',
      label: 'AI Prompts',
      render: (copy) => <AiPromptsTab copy={copy} />,
    },
  ];
}
