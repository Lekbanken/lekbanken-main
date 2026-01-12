'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ShoppingBagIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  GiftIcon,
  TagIcon,
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
  AdminStatCard,
  AdminStatGrid,
  useTableSelection,
} from '@/components/admin/shared';
import { Button, Badge } from '@/components/ui';
import type { 
  ShopItemRow, 
  ShopItemListParams, 
  ShopItemStats, 
  CurrencyOption 
} from '@/app/actions/shop-rewards-admin';
import {
  listShopItems,
  deleteShopItem,
  toggleShopItemAvailability,
  toggleShopItemFeatured,
  bulkToggleAvailability,
  duplicateShopItem,
  getShopItemStats,
} from '@/app/actions/shop-rewards-admin';
import { ShopItemEditorDrawer } from './ShopItemEditorDrawer';

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  cosmetic: 'default',
  powerup: 'secondary',
  bundle: 'outline',
  season_pass: 'outline',
};

// ============================================
// MAIN COMPONENT
// ============================================

interface ShopRewardsAdminClientProps {
  tenantId: string;
  tenantName: string;
  initialData: {
    items: ShopItemRow[];
    totalCount: number;
    totalPages: number;
  };
  initialStats: ShopItemStats;
  currencies: CurrencyOption[];
}

export function ShopRewardsAdminClient({
  tenantId,
  tenantName,
  initialData,
  initialStats,
  currencies,
}: ShopRewardsAdminClientProps) {
  const t = useTranslations('admin.gamification.shopRewards');

  // Dynamic options using translations
  const CATEGORY_OPTIONS = [
    { value: 'all', label: t('categories.all') },
    { value: 'cosmetic', label: t('categories.cosmetic') },
    { value: 'powerup', label: t('categories.powerup') },
    { value: 'bundle', label: t('categories.bundle') },
    { value: 'season_pass', label: t('categories.seasonPass') },
  ];

  const AVAILABILITY_OPTIONS = [
    { value: 'all', label: t('availability.all') },
    { value: 'available', label: t('availability.available') },
    { value: 'unavailable', label: t('availability.unavailable') },
  ];

  const FEATURED_OPTIONS = [
    { value: 'all', label: t('featuredFilter.all') },
    { value: 'featured', label: t('featuredFilter.featured') },
    { value: 'not_featured', label: t('featuredFilter.notFeatured') },
  ];

  const CATEGORY_LABELS: Record<string, string> = {
    cosmetic: t('categories.cosmetic'),
    'cosmetic:avatar': t('categories.avatar'),
    'cosmetic:avatar_frame': t('categories.avatarFrame'),
    'cosmetic:background': t('categories.background'),
    'cosmetic:title': t('categories.title'),
    'cosmetic:badge': t('categories.badge'),
    powerup: t('categories.powerup'),
    'powerup:hint': t('categories.hint'),
    'powerup:skip': t('categories.skip'),
    'powerup:time_extend': t('categories.timeExtend'),
    'powerup:double_xp': t('categories.doubleXp'),
    'powerup:shield': t('categories.shield'),
    bundle: t('categories.bundle'),
    season_pass: t('categories.seasonPass'),
  };

  // State
  const [items, setItems] = useState(initialData.items);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [stats, setStats] = useState(initialStats);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilterState] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilterState] = useState<string>('all');
  const [featuredFilter, setFeaturedFilterState] = useState<string>('all');

  // Filter setters that also reset page
  const setCategoryFilter = useCallback((value: string) => {
    setCategoryFilterState(value);
    setPage(1);
  }, []);

  const setAvailabilityFilter = useCallback((value: string) => {
    setAvailabilityFilterState(value);
    setPage(1);
  }, []);

  const setFeaturedFilter = useCallback((value: string) => {
    setFeaturedFilterState(value);
    setPage(1);
  }, []);

  // UI state
  const [isPending, startTransition] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItemRow | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    type: 'delete';
    item?: ShopItemRow;
  } | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Selection
  const selection = useTableSelection(items, 'id');

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
    const params: ShopItemListParams = {
      page,
      pageSize,
      search: debouncedSearch || undefined,
      category: categoryFilter === 'all' ? 'all' : categoryFilter as ShopItemListParams['category'],
      availability: availabilityFilter as ShopItemListParams['availability'],
      featured: featuredFilter as ShopItemListParams['featured'],
    };

    try {
      const [result, newStats] = await Promise.all([
        listShopItems(tenantId, params),
        getShopItemStats(tenantId),
      ]);
      setItems(result.data);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch shop items:', error);
      showNotification('error', t('notifications.couldNotFetch'));
    }
  }, [tenantId, page, pageSize, debouncedSearch, categoryFilter, availabilityFilter, featuredFilter, showNotification, t]);

  // Refetch on filter changes
  useEffect(() => {
    startTransition(() => {
      fetchData();
    });
  }, [fetchData]);

  // Handlers
  const handleCreate = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const handleEdit = (item: ShopItemRow) => {
    setEditingItem(item);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingItem(null);
  };

  const handleEditorSave = () => {
    setEditorOpen(false);
    setEditingItem(null);
    fetchData();
    showNotification('success', t('notifications.itemSaved'));
  };

  const handleToggleAvailability = async (item: ShopItemRow) => {
    const result = await toggleShopItemAvailability(tenantId, item.id, !item.is_available);
    if (result.success) {
      fetchData();
      showNotification('success', item.is_available ? t('notifications.hiddenFromShop') : t('notifications.visibleInShop'));
    } else {
      showNotification('error', result.error || t('notifications.couldNotUpdate'));
    }
  };

  const handleToggleFeatured = async (item: ShopItemRow) => {
    const result = await toggleShopItemFeatured(tenantId, item.id, !item.is_featured);
    if (result.success) {
      fetchData();
      showNotification('success', item.is_featured ? t('notifications.removedFromFeatured') : t('notifications.addedToFeatured'));
    } else {
      showNotification('error', result.error || t('notifications.couldNotUpdate'));
    }
  };

  const handleDuplicate = async (item: ShopItemRow) => {
    const result = await duplicateShopItem(tenantId, item.id);
    if (result.success) {
      fetchData();
      showNotification('success', t('notifications.duplicated', { name: item.name }));
    } else {
      showNotification('error', result.error || t('notifications.couldNotDuplicate'));
    }
  };

  const handleDelete = async (item: ShopItemRow) => {
    setConfirmData({ type: 'delete', item });
    setPendingConfirmAction(() => async () => {
      const result = await deleteShopItem(tenantId, item.id);
      if (result.success) {
        fetchData();
        showNotification('success', t('notifications.deleted'));
      } else {
        showNotification('error', result.error || t('notifications.couldNotDelete'));
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

  const handleBulkHide = async (selectedItems: ShopItemRow[]) => {
    const ids = selectedItems.map((i) => i.id);
    const result = await bulkToggleAvailability(tenantId, ids, false);
    if (result.success) {
      selection.clearSelection();
      fetchData();
      showNotification('success', t('bulkActions.itemsHidden', { count: result.updatedCount }));
    } else {
      showNotification('error', result.error || t('notifications.couldNotHide'));
    }
  };

  const handleBulkShow = async (selectedItems: ShopItemRow[]) => {
    const ids = selectedItems.map((i) => i.id);
    const result = await bulkToggleAvailability(tenantId, ids, true);
    if (result.success) {
      selection.clearSelection();
      fetchData();
      showNotification('success', t('bulkActions.itemsVisible', { count: result.updatedCount }));
    } else {
      showNotification('error', result.error || t('notifications.couldNotShow'));
    }
  };

  // Bulk actions
  const bulkActions = [
    {
      id: 'show',
      label: t('actions.showInShop'),
      icon: <EyeIcon className="h-4 w-4" />,
      onAction: handleBulkShow,
    },
    {
      id: 'hide',
      label: t('actions.hideFromShop'),
      icon: <EyeSlashIcon className="h-4 w-4" />,
      onAction: handleBulkHide,
    },
  ];

  // Get display category
  const getCategoryLabel = (category: string) => {
    return CATEGORY_LABELS[category] || category;
  };

  const getCategoryMainType = (category: string): string => {
    return category.split(':')[0];
  };

  // Table columns
  const columns = [
    {
      header: t('columns.name'),
      accessor: 'name' as keyof ShopItemRow,
      cell: (row: ShopItemRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden">
            {row.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ShoppingBagIcon className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{row.name}</p>
              {row.is_featured && (
                <SparklesIcon className="h-4 w-4 text-yellow-500" title={t('featured')} />
              )}
            </div>
            {row.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: t('columns.category'),
      accessor: 'category' as keyof ShopItemRow,
      width: 'w-32',
      cell: (row: ShopItemRow) => (
        <Badge variant={CATEGORY_COLORS[getCategoryMainType(row.category)] || 'outline'}>
          {getCategoryLabel(row.category)}
        </Badge>
      ),
    },
    {
      header: t('columns.price'),
      accessor: 'price' as keyof ShopItemRow,
      width: 'w-28',
      cell: (row: ShopItemRow) => (
        <div className="flex items-center gap-1.5">
          <CurrencyDollarIcon className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">{row.price.toLocaleString()}</span>
          {row.currency_symbol && (
            <span className="text-xs text-muted-foreground">{row.currency_symbol}</span>
          )}
        </div>
      ),
    },
    {
      header: t('columns.sales'),
      accessor: 'quantity_sold' as keyof ShopItemRow,
      width: 'w-28',
      hideBelow: 'md' as const,
      cell: (row: ShopItemRow) => (
        <div className="text-sm">
          <span className="font-medium">{row.quantity_sold}</span>
          {row.quantity_limit && (
            <span className="text-muted-foreground"> / {row.quantity_limit}</span>
          )}
        </div>
      ),
    },
    {
      header: t('columns.status'),
      accessor: 'is_available' as keyof ShopItemRow,
      width: 'w-28',
      cell: (row: ShopItemRow) => (
        <Badge variant={row.is_available ? 'success' : 'outline'}>
          {row.is_available ? t('status.available') : t('status.hidden')}
        </Badge>
      ),
    },
    {
      header: t('columns.actions'),
      accessor: 'id' as keyof ShopItemRow,
      width: 'w-44',
      align: 'right' as const,
      cell: (row: ShopItemRow) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            title={t('actions.edit')}
          >
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleToggleAvailability(row); }}
            title={row.is_available ? t('actions.hide') : t('actions.show')}
          >
            {row.is_available ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleToggleFeatured(row); }}
            title={row.is_featured ? t('actions.removeFeatured') : t('actions.addFeatured')}
            className={row.is_featured ? 'text-yellow-500' : ''}
          >
            <SparklesIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDuplicate(row); }}
            title={t('actions.duplicate')}
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            title={t('actions.delete')}
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
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.gamification'), href: '/admin/gamification' },
          { label: t('breadcrumbs.shopRewards') },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription', { tenantName })}
        actions={
          <Button onClick={handleCreate} disabled={currencies.length === 0}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('addItem')}
          </Button>
        }
      />

      {/* Currency Warning */}
      {currencies.length === 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <ExclamationCircleIcon className="h-5 w-5" />
          {t('currencyWarning')}
          <a href="/admin/gamification/currency" className="underline font-medium">
            {t('goToCurrency')}
          </a>
        </div>
      )}

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label={t('stats.totalItems')}
          value={stats.totalItems}
          icon={<ShoppingBagIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label={t('stats.available')}
          value={stats.availableItems}
          icon={<TagIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label={t('stats.totalSold')}
          value={stats.totalSold.toLocaleString()}
          icon={<GiftIcon className="h-5 w-5" />}
          iconColor="blue"
        />
        <AdminStatCard
          label={t('stats.totalRevenue')}
          value={stats.totalRevenue.toLocaleString()}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          iconColor="amber"
        />
      </AdminStatGrid>

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
        searchPlaceholder={t('searchPlaceholder')}
        filters={
          <>
            <AdminFilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_OPTIONS}
              label={t('filters.category')}
            />
            <AdminFilterSelect
              value={availabilityFilter}
              onChange={setAvailabilityFilter}
              options={AVAILABILITY_OPTIONS}
              label={t('filters.availability')}
            />
            <AdminFilterSelect
              value={featuredFilter}
              onChange={setFeaturedFilter}
              options={FEATURED_OPTIONS}
              label={t('filters.featured')}
            />
          </>
        }
        className="mb-4"
      />

      {/* Bulk Actions */}
      {selection.selectedItems.length > 0 && (
        <AdminBulkActions
          selectedItems={selection.selectedItems}
          totalItems={items.length}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
          onSelectAll={selection.selectAll}
          allSelected={selection.allSelected}
          className="mb-4"
        />
      )}

      {/* Table */}
      {items.length === 0 && !isPending ? (
        <AdminEmptyState
          icon={<ShoppingBagIcon className="h-12 w-12" />}
          title={t('empty.title')}
          description={
            search || categoryFilter !== 'all' || availabilityFilter !== 'all' || featuredFilter !== 'all'
              ? t('empty.noMatch')
              : t('empty.getStarted')
          }
          action={
            !search && categoryFilter === 'all' && availabilityFilter === 'all' && featuredFilter === 'all' && currencies.length > 0
              ? { label: t('addItem'), onClick: handleCreate }
              : undefined
          }
        />
      ) : (
        <>
          <AdminDataTable
            data={items}
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
      <ShopItemEditorDrawer
        open={editorOpen}
        item={editingItem}
        tenantId={tenantId}
        currencies={currencies}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
      />

      {/* Confirm Dialog */}
      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('confirmDelete.title')}
        description={t('confirmDelete.description', { name: confirmData?.item?.name || '' })}
        confirmLabel={t('confirmDelete.confirm')}
        variant="danger"
        onConfirm={handleConfirmAction}
      />
    </AdminPageLayout>
  );
}
