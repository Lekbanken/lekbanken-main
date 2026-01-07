'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PuzzlePieceIcon,
  PlusIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  WrenchScrewdriverIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminPagination,
} from '@/components/admin/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';

// Legacy components for Import/Export/Info
import { GameImportDialog } from '../components/GameImportDialog';
import { GameExportDialog } from '../components/GameExportDialog';
import { GameInfoDialog } from '../components/GameInfoDialog';

// V2 Components
import { GameCardDrawer } from './components/GameCardDrawer';
import { GameFilterPanel, GameFilterBar } from './components/GameFilterPanel';
import { GameBulkActionsBar, useBulkSelection } from './components/GameBulkActions';
import type {
  GameAdminRow,
  GameAdminFilters,
  GameListResponse,
  SelectOption,
  ValidationState,
  PlayMode,
  BulkOperationResult,
} from './types';
import { PLAY_MODE_META } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 25;

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ValidationBadge({ state }: { state: ValidationState }) {
  const config = {
    valid: { icon: CheckCircleIcon, variant: 'success' as const, label: '✓' },
    warnings: { icon: ExclamationTriangleIcon, variant: 'warning' as const, label: '!' },
    errors: { icon: XCircleIcon, variant: 'destructive' as const, label: '×' },
    pending: { icon: ClockIcon, variant: 'secondary' as const, label: '?' },
    outdated: { icon: InformationCircleIcon, variant: 'outline' as const, label: '~' },
  };

  const { icon: Icon, variant } = config[state] || config.pending;

  return (
    <Badge variant={variant} className="h-6 w-6 p-0 justify-center" title={state}>
      <Icon className="h-3 w-3" />
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'published' ? 'success' : 'secondary';
  const label = status === 'published' ? 'Publicerad' : 'Utkast';
  return <Badge variant={variant}>{label}</Badge>;
}

function PlayModeBadge({ mode }: { mode: PlayMode | null }) {
  if (!mode) return <span className="text-muted-foreground text-xs">—</span>;
  const meta = PLAY_MODE_META[mode];
  return (
    <Badge
      variant="outline"
      className="text-xs"
      style={{ borderColor: meta.color, color: meta.color }}
    >
      {meta.labelShort}
    </Badge>
  );
}

function GameCover({ game }: { game: GameAdminRow }) {
  const coverMedia = game.media?.find((m) => m.kind === 'cover');
  const coverUrl = coverMedia?.media?.url;

  if (!coverUrl) {
    return (
      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
        <PuzzlePieceIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={coverUrl}
      alt=""
      className="h-10 w-10 rounded object-cover"
    />
  );
}

// ============================================================================
// GAME TABLE ROW
// ============================================================================

type GameRowProps = {
  game: GameAdminRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenCard: () => void;
  onOpenBuilder: () => void;
  onPublishToggle: () => void;
  canEdit: boolean;
};

function GameRow({
  game,
  isSelected,
  onToggleSelect,
  onOpenCard,
  onOpenBuilder,
  onPublishToggle,
  canEdit,
}: GameRowProps) {

  return (
    <tr
      className={`hover:bg-muted/50 cursor-pointer border-b border-border ${
        isSelected ? 'bg-primary/5' : ''
      }`}
      onClick={onOpenCard}
    >
      {/* Checkbox */}
      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Välj ${game.name}`}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
      </td>

      {/* Cover */}
      <td className="w-12 px-2 py-3">
        <GameCover game={game} />
      </td>

      {/* Name & Description */}
      <td className="px-3 py-3 min-w-[200px]">
        <div className="flex flex-col">
          <span className="font-medium text-sm truncate max-w-[300px]">
            {game.name}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {game.short_description || '—'}
          </span>
        </div>
      </td>

      {/* Play Mode */}
      <td className="px-3 py-3">
        <PlayModeBadge mode={game.play_mode} />
      </td>

      {/* Purpose */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className="text-sm truncate max-w-[150px] inline-block">
          {game.main_purpose?.name || '—'}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={game.status} />
      </td>

      {/* Validation */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <ValidationBadge state={game.validation_state || 'pending'} />
      </td>

      {/* Owner */}
      <td className="px-3 py-3 hidden md:table-cell">
        <span className="text-sm text-muted-foreground">
          {game.owner?.name || 'Global'}
        </span>
      </td>

      {/* Updated */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">
          {new Date(game.updated_at).toLocaleDateString('sv-SE')}
        </span>
      </td>

      {/* Actions */}
      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-muted">
              <EllipsisVerticalIcon className="h-5 w-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={onOpenBuilder}>
                <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                Öppna i Builder
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onOpenCard}>
              <InformationCircleIcon className="h-4 w-4 mr-2" />
              Visa detaljer
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={onPublishToggle}>
                {game.status === 'published' ? (
                  <>
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Avpublicera
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Publicera
                  </>
                )}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameAdminPageV2() {
  const { can } = useRbac();
  const { warning, info } = useToast();
  const router = useRouter();
  const _searchParams = useSearchParams();

  // State
  const [games, setGames] = useState<GameAdminRow[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<GameAdminFilters>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'updated_at',
    sortOrder: 'desc',
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Reference data
  const [purposes, setPurposes] = useState<SelectOption[]>([]);
  const [tenants, setTenants] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);

  // UI state
  const [selectedGame, setSelectedGame] = useState<GameAdminRow | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Selection
  const selection = useBulkSelection(games);

  // Permissions
  const canView = can('admin.games.list');
  const canEdit = can('admin.games.edit');

  // Stats
  const stats = useMemo(() => {
    return {
      total: totalGames,
      published: games.filter((g) => g.status === 'published').length,
      drafts: games.filter((g) => g.status === 'draft').length,
      withErrors: games.filter((g) => g.validation_state === 'errors').length,
    };
  }, [games, totalGames]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.classification?.mainPurposes?.length) count++;
    if (filters.classification?.ageMin !== undefined) count++;
    if (filters.classification?.ageMax !== undefined) count++;
    if (filters.playExecution?.playModes?.length) count++;
    if (filters.playExecution?.energyLevels?.length) count++;
    if (filters.lifecycle?.statuses?.length) count++;
    if (filters.lifecycle?.validationStates?.length) count++;
    if (filters.ownership?.isGlobal !== undefined) count++;
    if (filters.ownership?.tenantIds?.length) count++;
    if (filters.technical?.gameContentVersions?.length) count++;
    return count;
  }, [filters]);

  // Load games
  const loadGames = useCallback(async () => {
    if (!canView) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/games/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load games');
      }

      const data: GameListResponse = await response.json();
      setGames(data.games);
      setTotalGames(data.total);
    } catch (err) {
      console.error('[GameAdminPageV2] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setIsLoading(false);
    }
  }, [canView, filters]);

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    try {
      const [purposesRes, tenantsRes, productsRes] = await Promise.all([
        fetch('/api/purposes'),
        fetch('/api/tenants'),
        fetch('/api/products'),
      ]);

      if (purposesRes.ok) {
        const data = await purposesRes.json();
        setPurposes(
          (data.purposes || []).map((p: { id: string; name: string }) => ({
            value: p.id,
            label: p.name || 'Okänt syfte',
          }))
        );
      }

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(
          (data.tenants || []).map((t: { id: string; name: string }) => ({
            value: t.id,
            label: t.name || 'Namnlös organisation',
          }))
        );
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(
          (data.products || []).map((p: { id: string; name: string }) => ({
            value: p.id,
            label: p.name || 'Okänd produkt',
          }))
        );
      }
    } catch (err) {
      console.error('[GameAdminPageV2] Reference data error:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  // Handlers
  const handleOpenCard = useCallback((game: GameAdminRow) => {
    setSelectedGame(game);
    setCardOpen(true);
  }, []);

  const handleOpenBuilder = useCallback((game: GameAdminRow) => {
    router.push(`/admin/games/${game.id}/edit`);
  }, [router]);

  const handlePublishToggle = useCallback(async (game: GameAdminRow) => {
    const newStatus = game.status === 'published' ? 'draft' : 'published';

    try {
      if (newStatus === 'published') {
        const res = await fetch(`/api/games/${game.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hasCoverImage: true, force: true }),
        });
        if (!res.ok) throw new Error('Publish failed');
      } else {
        const res = await fetch(`/api/games/${game.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'draft' }),
        });
        if (!res.ok) throw new Error('Unpublish failed');
      }

      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, status: newStatus } : g))
      );
      info(newStatus === 'published' ? 'Publicerad' : 'Avpublicerad');
    } catch {
      warning('Åtgärden misslyckades');
    }
  }, [info, warning]);

  const handleFilterChange = useCallback((newFilters: GameAdminFilters) => {
    setFilters(newFilters);
    selection.clearSelection();
  }, [selection]);

  const handleBulkActionComplete = useCallback((result: BulkOperationResult) => {
    if (result.success) {
      void loadGames();
    }
  }, [loadGames]);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // Permission check
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

  const totalPages = Math.ceil(totalGames / (filters.pageSize || DEFAULT_PAGE_SIZE));

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[{ label: 'Startsida', href: '/admin' }, { label: 'Spel' }]}
      />

      <AdminPageHeader
        title="Spel (globalt)"
        description="Hantera spelkatalogen – sök, filtrera, och utför massåtgärder."
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
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/admin/games/new')}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Ny i Builder
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda spel"
          description={error}
          onRetry={() => void loadGames()}
        />
      )}

      {/* Stats */}
      <AdminStatGrid className="mb-4">
        <AdminStatCard label="Totalt" value={stats.total} />
        <AdminStatCard label="Publicerade" value={stats.published} />
        <AdminStatCard label="Utkast" value={stats.drafts} />
        <AdminStatCard label="Med fel" value={stats.withErrors} />
      </AdminStatGrid>

      {/* Bulk Actions Bar */}
      {selection.selectedCount > 0 && (
        <GameBulkActionsBar
          selectedGames={selection.selectedItems}
          totalGames={totalGames}
          onClearSelection={selection.clearSelection}
          onSelectAll={selection.selectAll}
          allSelected={selection.allSelected}
          onActionComplete={handleBulkActionComplete}
          className="mb-4"
        />
      )}

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Filter Panel (sidebar) */}
        {showFilterPanel && (
          <div className="w-80 flex-shrink-0">
            <GameFilterPanel
              filters={filters}
              onChange={handleFilterChange}
              purposes={purposes}
              tenants={tenants}
              products={products}
            />
          </div>
        )}

        {/* Table */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle>Spelöversikt</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Filter Bar */}
            <div className="px-6 py-4 border-b border-border">
              <GameFilterBar
                filters={filters}
                onChange={handleFilterChange}
                onOpenFullPanel={() => setShowFilterPanel(true)}
                totalActiveFilters={activeFilterCount}
              />
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : games.length === 0 ? (
              <AdminEmptyState
                icon={<PuzzlePieceIcon className="h-6 w-6" />}
                title="Inga spel matchar filtren"
                description="Justera filter eller lägg till ett nytt spel."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="w-10 px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selection.allSelected}
                          onChange={() =>
                            selection.allSelected
                              ? selection.clearSelection()
                              : selection.selectAll()
                          }
                          className="h-4 w-4 rounded border-border"
                        />
                      </th>
                      <th className="w-12 px-2 py-3"></th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Namn
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Läge
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                        Syfte
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden xl:table-cell">
                        Valid
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                        Ägare
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                        Uppdaterad
                      </th>
                      <th className="w-10 px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game) => (
                      <GameRow
                        key={game.id}
                        game={game}
                        isSelected={selection.isSelected(game)}
                        onToggleSelect={() => selection.toggle(game)}
                        onOpenCard={() => handleOpenCard(game)}
                        onOpenBuilder={() => handleOpenBuilder(game)}
                        onPublishToggle={() => handlePublishToggle(game)}
                        canEdit={canEdit}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-border">
                <AdminPagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  totalItems={totalGames}
                  itemsPerPage={filters.pageSize || DEFAULT_PAGE_SIZE}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Game Card Drawer */}
      <GameCardDrawer
        game={selectedGame}
        open={cardOpen}
        onOpenChange={setCardOpen}
      />

      {/* Import Dialog */}
      <GameImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async () => {
          await loadGames();
        }}
      />

      {/* Export Dialog */}
      <GameExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        selectedIds={[]}
        totalCount={games.length}
      />
    </AdminPageLayout>
  );
}
