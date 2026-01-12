'use client';

import { useState, useCallback, useTransition, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  TrophyIcon,
  PlusIcon,
  PencilSquareIcon,
  GiftIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  AdminPageHeader,
  AdminPageLayout,
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
import { useTenant } from '@/lib/context/TenantContext';
import type { 
  TenantAchievementRow, 
  TenantAchievementListParams,
} from '@/app/actions/tenant-achievements-admin';
import {
  listTenantAchievements,
  setTenantAchievementStatus,
  bulkSetTenantAchievementStatus,
  deleteTenantAchievement,
  getTenantAchievementStats,
} from '@/app/actions/tenant-achievements-admin';
import { TenantAchievementEditorDrawer } from './TenantAchievementEditorDrawer';
import { TenantAwardModal } from './TenantAwardModal';

// ============================================
// CONSTANTS
// ============================================

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
  draft: 'secondary',
  active: 'success',
  archived: 'outline',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TenantAchievementsPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;
  const t = useTranslations('admin.tenant.achievements');

  // Translated options
  const STATUS_OPTIONS = useMemo(() => [
    { value: 'all', label: t('status.all') },
    { value: 'draft', label: t('status.draftPlural') },
    { value: 'active', label: t('status.activePlural') },
    { value: 'archived', label: t('status.archivedPlural') },
  ], [t]);

  const STATUS_LABELS: Record<string, string> = useMemo(() => ({
    draft: t('status.draft'),
    active: t('status.active'),
    archived: t('status.archived'),
  }), [t]);

  // State
  const [achievements, setAchievements] = useState<TenantAchievementRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0, archived: 0 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilterState] = useState<string>('all');

  const setStatusFilter = useCallback((value: string) => {
    setStatusFilterState(value);
    setPage(1);
  }, []);

  // UI state
  const [isPending, startTransition] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<TenantAchievementRow | null>(null);
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [awardingAchievement, setAwardingAchievement] = useState<TenantAchievementRow | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    type: 'delete' | 'archive' | 'activate';
    achievement?: TenantAchievementRow;
  } | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Selection
  const selection = useTableSelection(achievements, 'id');

  // Notification helper
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    const params: TenantAchievementListParams = {
      page,
      pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter as 'draft' | 'active' | 'archived',
    };

    try {
      const [result, statsResult] = await Promise.all([
        listTenantAchievements(tenantId, params),
        getTenantAchievementStats(tenantId),
      ]);
      setAchievements(result.data);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setStats(statsResult);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      showNotification('error', t('fetchError'));
      setIsInitialLoad(false);
    }
  }, [tenantId, page, pageSize, debouncedSearch, statusFilter, showNotification, t]);

  // Refetch on filter changes
  useEffect(() => {
    startTransition(() => {
      fetchData();
    });
  }, [fetchData]);

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingAchievement(null);
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback((achievement: TenantAchievementRow) => {
    setEditingAchievement(achievement);
    setEditorOpen(true);
  }, []);

  const handleAward = useCallback((achievement: TenantAchievementRow) => {
    if (achievement.status !== 'active') {
      showNotification('error', t('onlyActiveCanBeAwarded'));
      return;
    }
    setAwardingAchievement(achievement);
    setAwardModalOpen(true);
  }, [showNotification, t]);

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false);
    setEditingAchievement(null);
  }, []);

  const handleEditorSave = useCallback(() => {
    setEditorOpen(false);
    setEditingAchievement(null);
    fetchData();
    showNotification('success', t('achievementSaved'));
  }, [fetchData, showNotification, t]);

  const handleAwardClose = useCallback(() => {
    setAwardModalOpen(false);
    setAwardingAchievement(null);
  }, []);

  const handleAwardComplete = useCallback((inserted: number, duplicates: number) => {
    setAwardModalOpen(false);
    setAwardingAchievement(null);
    if (inserted > 0) {
      showNotification('success', duplicates > 0 
        ? t('awardedWithDuplicates', { count: inserted, duplicates })
        : t('awardedTo', { count: inserted })
      );
    } else if (duplicates > 0) {
      showNotification('success', t('allHadAlready', { count: duplicates }));
    }
  }, [showNotification, t]);

  const handleStatusChange = useCallback(async (achievement: TenantAchievementRow, status: 'draft' | 'active' | 'archived') => {
    if (!tenantId) return;
    const result = await setTenantAchievementStatus(tenantId, achievement.id, status);
    if (result.success) {
      fetchData();
      showNotification('success', t('statusChangedTo', { status: STATUS_LABELS[status].toLowerCase() }));
    } else {
      showNotification('error', result.error || t('couldNotUpdateStatus'));
    }
  }, [tenantId, fetchData, showNotification, t, STATUS_LABELS]);

  const handleDelete = useCallback(async (achievement: TenantAchievementRow) => {
    setConfirmData({ type: 'delete', achievement });
    setPendingConfirmAction(() => async () => {
      if (!tenantId) return;
      const result = await deleteTenantAchievement(tenantId, achievement.id);
      if (result.success) {
        fetchData();
        showNotification('success', t('achievementDeleted'));
      } else {
        showNotification('error', result.error || t('couldNotDelete'));
      }
    });
    setConfirmOpen(true);
  }, [tenantId, fetchData, showNotification, t]);

  const handleBulkStatusChange = useCallback(async (status: 'active' | 'archived') => {
    if (!tenantId) return;
    const ids = Array.from(selection.selectedKeys) as string[];
    if (ids.length === 0) return;

    const result = await bulkSetTenantAchievementStatus(tenantId, ids, status);
    if (result.success) {
      selection.clearSelection();
      fetchData();
      showNotification('success', t('achievementsUpdated', { count: result.updatedCount }));
    } else {
      showNotification('error', result.error || t('couldNotUpdate'));
    }
  }, [tenantId, selection, fetchData, showNotification, t]);

  const handleConfirmAction = useCallback(async () => {
    if (pendingConfirmAction) {
      await pendingConfirmAction();
    }
    setConfirmOpen(false);
    setConfirmData(null);
    setPendingConfirmAction(null);
  }, [pendingConfirmAction]);

  // Table columns
  const columns = useMemo(() => [
    {
      header: t('table.name'),
      accessor: 'name' as const,
      cell: (row: TenantAchievementRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrophyIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-slate-900">{row.name}</div>
            {row.achievement_key && (
              <div className="text-xs text-slate-500">{row.achievement_key}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: t('table.description'),
      accessor: 'description' as const,
      cell: (row: TenantAchievementRow) => (
        <span className="text-slate-600 line-clamp-1">
          {row.description || t('table.noDescription')}
        </span>
      ),
    },
    {
      header: t('table.status'),
      accessor: 'status' as const,
      cell: (row: TenantAchievementRow) => (
        <Badge variant={STATUS_VARIANTS[row.status] || 'default'}>
          {STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
    {
      header: '',
      accessor: () => '',
      cell: (row: TenantAchievementRow) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
            title={t('actions.edit')}
          >
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          {row.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAward(row)}
              title={t('actions.award')}
            >
              <GiftIcon className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row, 'active')}
              title={t('actions.activate')}
            >
              <CheckCircleIcon className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row, 'archived')}
              title={t('actions.archive')}
            >
              <ArchiveBoxIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            title={t('actions.delete')}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [handleEdit, handleAward, handleStatusChange, handleDelete, t, STATUS_LABELS]);

  // Bulk actions
  const bulkActions = useMemo(() => [
    bulkActionPresets.activate<TenantAchievementRow>(() => handleBulkStatusChange('active')),
    bulkActionPresets.archive<TenantAchievementRow>(() => handleBulkStatusChange('archived')),
  ], [handleBulkStatusChange]);

  // No tenant selected
  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<TrophyIcon className="h-6 w-6" />}
          title={t('noTenant.title')}
          description={t('noTenant.description')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      {/* Notification */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription', { tenantName: currentTenant?.name || '' })}
        actions={
          <Button onClick={handleCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('newButton')}
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-500">{t('stats.total')}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-slate-500">{t('stats.active')}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
          <div className="text-sm text-slate-500">{t('stats.draft')}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-slate-400">{stats.archived}</div>
          <div className="text-sm text-slate-500">{t('stats.archived')}</div>
        </div>
      </div>

      {/* Toolbar */}
      <AdminTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('search.placeholder')}
        filters={
          <AdminFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            label={t('table.status')}
          />
        }
      />

      {/* Bulk actions */}
      {selection.selectedCount > 0 && (
        <AdminBulkActions
          selectedItems={selection.selectedItems}
          totalItems={achievements.length}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
          onSelectAll={selection.selectAll}
          allSelected={selection.allSelected}
        />
      )}

      {/* Table */}
      {isInitialLoad ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : achievements.length === 0 ? (
        <AdminEmptyState
          icon={<TrophyIcon className="h-6 w-6" />}
          title={debouncedSearch || statusFilter !== 'all' ? t('empty.title') : t('empty.titleNoAchievements')}
          description={
            debouncedSearch || statusFilter !== 'all'
              ? t('empty.filtered')
              : t('empty.noAchievements')
          }
          action={
            !(debouncedSearch || statusFilter !== 'all') ? {
              label: t('empty.createButton'),
              onClick: handleCreate,
              icon: <PlusIcon className="h-4 w-4" />,
            } : undefined
          }
        />
      ) : (
        <>
          <AdminDataTable
            columns={columns}
            data={achievements}
            keyAccessor="id"
            isLoading={isPending}
            selectable
            isRowSelected={selection.isSelected}
            onToggleRow={selection.toggle}
            onToggleAll={selection.toggleAll}
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
          />

          {totalPages > 1 && (
            <AdminPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={pageSize}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Editor Drawer */}
      {editorOpen && (
        <TenantAchievementEditorDrawer
          tenantId={tenantId}
          achievement={editingAchievement}
          open={editorOpen}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
        />
      )}

      {/* Award Modal */}
      {awardModalOpen && awardingAchievement && (
        <TenantAwardModal
          tenantId={tenantId}
          achievement={awardingAchievement}
          open={awardModalOpen}
          onClose={handleAwardClose}
          onComplete={handleAwardComplete}
        />
      )}

      {/* Confirm Dialog */}
      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setConfirmData(null);
            setPendingConfirmAction(null);
          }
        }}
        onConfirm={handleConfirmAction}
        title={
          confirmData?.type === 'delete'
            ? t('confirm.deleteTitle')
            : confirmData?.type === 'archive'
            ? t('confirm.archiveTitle')
            : t('confirm.activateTitle')
        }
        description={
          confirmData?.type === 'delete'
            ? t('confirm.deleteDescription', { name: confirmData.achievement?.name || '' })
            : confirmData?.type === 'archive'
            ? t('confirm.archiveDescription', { name: confirmData?.achievement?.name || '' })
            : t('confirm.activateDescription', { name: confirmData?.achievement?.name || '' })
        }
        confirmLabel={confirmData?.type === 'delete' ? t('confirm.deleteLabel') : t('confirm.confirmLabel')}
        variant={confirmData?.type === 'delete' ? 'danger' : 'warning'}
      />
    </AdminPageLayout>
  );
}
