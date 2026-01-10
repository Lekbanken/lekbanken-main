'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import {
  TrophyIcon,
  PlusIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  LockClosedIcon,
  PencilSquareIcon,
  GiftIcon,
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
  AdminDataTable,
  AdminTableToolbar,
  AdminPagination,
  AdminFilterSelect,
  AdminEmptyState,
  AdminConfirmDialog,
  AdminBulkActions,
  useTableSelection,
  bulkActionPresets,
} from '@/components/admin/shared';
import { Button, Badge } from '@/components/ui';
import type { AchievementRow, TenantOption, AchievementListParams } from '@/app/actions/achievements-admin';
import {
  listAchievements,
  setAchievementStatus,
  bulkSetAchievementStatus,
  deleteAchievement,
} from '@/app/actions/achievements-admin';
import { AchievementEditorDrawer } from './AchievementEditorDrawer';
import { AwardAchievementModal } from './AwardAchievementModal';

// ============================================
// CONSTANTS
// ============================================

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Alla scopes' },
  { value: 'global', label: 'Global' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'private', label: 'Privat' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'draft', label: 'Utkast' },
  { value: 'active', label: 'Aktiv' },
  { value: 'archived', label: 'Arkiverad' },
];

const SCOPE_ICONS: Record<string, React.ReactNode> = {
  global: <GlobeAltIcon className="h-4 w-4" />,
  tenant: <BuildingOfficeIcon className="h-4 w-4" />,
  private: <LockClosedIcon className="h-4 w-4" />,
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
  draft: 'secondary',
  active: 'success',
  archived: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  active: 'Aktiv',
  archived: 'Arkiverad',
};

// ============================================
// MAIN COMPONENT
// ============================================

interface AchievementsAdminClientProps {
  initialData: {
    achievements: AchievementRow[];
    totalCount: number;
    totalPages: number;
  };
  tenants: TenantOption[];
}

export function AchievementsAdminClient({
  initialData,
  tenants,
}: AchievementsAdminClientProps) {
  // State
  const [achievements, setAchievements] = useState(initialData.achievements);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scopeFilter, setScopeFilterState] = useState<string>('all');
  const [statusFilter, setStatusFilterState] = useState<string>('all');
  const [tenantFilter, setTenantFilterState] = useState<string>('');

  // Filter setters that also reset page
  const setScopeFilter = useCallback((value: string) => {
    setScopeFilterState(value);
    setPage(1);
  }, []);
  
  const setStatusFilter = useCallback((value: string) => {
    setStatusFilterState(value);
    setPage(1);
  }, []);
  
  const setTenantFilter = useCallback((value: string) => {
    setTenantFilterState(value);
    setPage(1);
  }, []);

  // UI state
  const [isPending, startTransition] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementRow | null>(null);
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [awardingAchievement, setAwardingAchievement] = useState<AchievementRow | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    type: 'delete' | 'archive' | 'activate';
    achievement?: AchievementRow;
  } | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Selection using the hook with the proper parameters
  const selection = useTableSelection(achievements, 'id');

  // Notification helper (defined before it's used in callbacks)
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Debounce search and reset page when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page when search changes (debounced)
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  const fetchData = useCallback(async () => {
    const params: AchievementListParams = {
      page,
      pageSize,
      search: debouncedSearch || undefined,
      scope: scopeFilter === 'all' ? undefined : scopeFilter as 'global' | 'tenant' | 'private',
      status: statusFilter === 'all' ? undefined : statusFilter as 'draft' | 'active' | 'archived',
      tenantId: tenantFilter || undefined,
    };

    try {
      const result = await listAchievements(params);
      setAchievements(result.data);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      showNotification('error', 'Kunde inte hämta achievements');
    }
  }, [page, pageSize, debouncedSearch, scopeFilter, statusFilter, tenantFilter, showNotification]);

  // Refetch on filter changes
  useEffect(() => {
    startTransition(() => {
      fetchData();
    });
  }, [fetchData]);

  // Handlers
  const handleCreate = () => {
    setEditingAchievement(null);
    setEditorOpen(true);
  };

  const handleEdit = (achievement: AchievementRow) => {
    setEditingAchievement(achievement);
    setEditorOpen(true);
  };

  const handleAward = (achievement: AchievementRow) => {
    setAwardingAchievement(achievement);
    setAwardModalOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingAchievement(null);
  };

  const handleEditorSave = () => {
    setEditorOpen(false);
    setEditingAchievement(null);
    fetchData();
    showNotification('success', 'Achievement sparat');
  };

  const handleAwardClose = () => {
    setAwardModalOpen(false);
    setAwardingAchievement(null);
  };

  const handleAwardComplete = (inserted: number, duplicates: number) => {
    setAwardModalOpen(false);
    setAwardingAchievement(null);
    if (inserted > 0) {
      showNotification('success', `Tilldelat till ${inserted} användare${duplicates > 0 ? ` (${duplicates} hade redan)` : ''}`);
    } else if (duplicates > 0) {
      showNotification('success', `Alla ${duplicates} användare hade redan detta achievement`);
    }
  };

  const handleStatusChange = async (achievement: AchievementRow, status: 'draft' | 'active' | 'archived') => {
    const result = await setAchievementStatus(achievement.id, status);
    if (result.success) {
      fetchData();
      showNotification('success', `Achievement ${STATUS_LABELS[status].toLowerCase()}`);
    } else {
      showNotification('error', result.error || 'Kunde inte uppdatera status');
    }
  };

  const handleDelete = async (achievement: AchievementRow) => {
    setConfirmData({ type: 'delete', achievement });
    setPendingConfirmAction(() => async () => {
      const result = await deleteAchievement(achievement.id);
      if (result.success) {
        fetchData();
        showNotification('success', 'Achievement borttaget');
      } else {
        showNotification('error', result.error || 'Kunde inte ta bort');
      }
    });
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (pendingConfirmAction) {
      await pendingConfirmAction();
    }
    setConfirmOpen(false);
    setConfirmData(null);
    setPendingConfirmAction(null);
  };

  const handleBulkArchive = async (items: AchievementRow[]) => {
    const ids = items.map(a => a.id);
    const result = await bulkSetAchievementStatus(ids, 'archived');
    if (result.success) {
      selection.clearSelection();
      fetchData();
      showNotification('success', `${result.count} achievements arkiverade`);
    } else {
      showNotification('error', result.error || 'Kunde inte arkivera');
    }
  };

  const handleBulkActivate = async (items: AchievementRow[]) => {
    const ids = items.map(a => a.id);
    const result = await bulkSetAchievementStatus(ids, 'active');
    if (result.success) {
      selection.clearSelection();
      fetchData();
      showNotification('success', `${result.count} achievements aktiverade`);
    } else {
      showNotification('error', result.error || 'Kunde inte aktivera');
    }
  };

  // Tenant options for filter
  const tenantOptions = [
    ...tenants.map(t => ({ value: t.id, label: t.name })),
  ];

  // Bulk actions using presets
  const bulkActions = [
    bulkActionPresets.activate(handleBulkActivate),
    bulkActionPresets.archive(handleBulkArchive),
  ];

  // Table columns
  const columns = [
    {
      header: 'Namn',
      accessor: 'name' as keyof AchievementRow,
      cell: (row: AchievementRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrophyIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            {row.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Scope',
      accessor: 'scope' as keyof AchievementRow,
      width: 'w-28',
      cell: (row: AchievementRow) => (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{SCOPE_ICONS[row.scope]}</span>
          <span className="text-sm capitalize">{row.scope}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status' as keyof AchievementRow,
      width: 'w-28',
      cell: (row: AchievementRow) => (
        <Badge variant={STATUS_VARIANTS[row.status]}>
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      header: 'Trigger',
      accessor: 'condition_type' as keyof AchievementRow,
      width: 'w-32',
      hideBelow: 'md' as const,
      cell: (row: AchievementRow) => (
        <span className="text-sm text-muted-foreground">{row.condition_type}</span>
      ),
    },
    {
      header: 'Åtgärder',
      accessor: 'id' as keyof AchievementRow,
      width: 'w-40',
      align: 'right' as const,
      cell: (row: AchievementRow) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            title="Redigera"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleAward(row); }}
            title="Tilldela"
            disabled={row.status === 'archived'}
          >
            <GiftIcon className="h-4 w-4" />
          </Button>
          {row.status !== 'archived' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleStatusChange(row, 'archived'); }}
              title="Arkivera"
            >
              <ArchiveBoxIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleStatusChange(row, 'draft'); }}
              title="Återställ"
            >
              <ArchiveBoxXMarkIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            title="Ta bort"
            className="text-destructive hover:text-destructive"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Gamification', href: '/admin/gamification' },
          { label: 'Achievements' },
        ]}
      />

      <AdminPageHeader
        title="Achievements"
        description="Hantera achievements, tilldela till användare och konfigurera regler."
        actions={
          <Button onClick={handleCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Skapa achievement
          </Button>
        }
      />

      {/* Notification */}
      {notification && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            notification.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <ExclamationCircleIcon className="h-5 w-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Toolbar */}
      <AdminTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Sök achievements..."
        filters={
          <>
            <AdminFilterSelect
              value={scopeFilter}
              onChange={setScopeFilter}
              options={SCOPE_OPTIONS}
              label="Scope"
            />
            <AdminFilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              label="Status"
            />
            {scopeFilter === 'tenant' && (
              <AdminFilterSelect
                value={tenantFilter}
                onChange={setTenantFilter}
                options={tenantOptions}
                label="Tenant"
                placeholder="Välj tenant"
              />
            )}
          </>
        }
        className="mb-4"
      />

      {/* Bulk Actions */}
      {selection.selectedItems.length > 0 && (
        <AdminBulkActions
          selectedItems={selection.selectedItems}
          totalItems={achievements.length}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
          onSelectAll={selection.selectAll}
          allSelected={selection.allSelected}
          className="mb-4"
        />
      )}

      {/* Table */}
      {achievements.length === 0 && !isPending ? (
        <AdminEmptyState
          icon={<TrophyIcon className="h-12 w-12" />}
          title="Inga achievements"
          description={search || scopeFilter !== 'all' || statusFilter !== 'all'
            ? 'Inga achievements matchar dina filter.'
            : 'Skapa ditt första achievement för att komma igång.'}
          action={
            !search && scopeFilter === 'all' && statusFilter === 'all'
              ? { label: 'Skapa achievement', onClick: handleCreate }
              : undefined
          }
        />
      ) : (
        <>
          <AdminDataTable
            data={achievements}
            columns={columns}
            keyAccessor="id"
            isLoading={isPending}
            onRowClick={handleEdit}
            selectable
            isRowSelected={selection.isSelected}
            onToggleRow={selection.toggle}
            onToggleAll={selection.toggleAll}
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
          />

          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      {/* Editor Drawer */}
      <AchievementEditorDrawer
        open={editorOpen}
        achievement={editingAchievement}
        tenants={tenants}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
      />

      {/* Award Modal */}
      {awardingAchievement && (
        <AwardAchievementModal
          open={awardModalOpen}
          achievement={awardingAchievement}
          tenants={tenants}
          onClose={handleAwardClose}
          onComplete={handleAwardComplete}
        />
      )}

      {/* Confirm Dialog */}
      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          confirmData?.type === 'delete'
            ? 'Ta bort achievement'
            : 'Bekräfta åtgärd'
        }
        description={
          confirmData?.type === 'delete'
            ? `Är du säker på att du vill ta bort "${confirmData.achievement?.name}"? Detta kan inte ångras.`
            : 'Är du säker?'
        }
        confirmLabel={confirmData?.type === 'delete' ? 'Ta bort' : 'Bekräfta'}
        variant="danger"
        onConfirm={handleConfirmAction}
      />
    </AdminPageLayout>
  );
}
