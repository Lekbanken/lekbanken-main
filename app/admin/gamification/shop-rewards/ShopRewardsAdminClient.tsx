'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
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

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Alla kategorier' },
  { value: 'cosmetic', label: 'Kosmetisk' },
  { value: 'powerup', label: 'Power-up' },
  { value: 'bundle', label: 'Paket' },
  { value: 'season_pass', label: 'Season Pass' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'Alla' },
  { value: 'available', label: 'Tillgängliga' },
  { value: 'unavailable', label: 'Ej tillgängliga' },
];

const FEATURED_OPTIONS = [
  { value: 'all', label: 'Alla' },
  { value: 'featured', label: 'Framhävda' },
  { value: 'not_featured', label: 'Ej framhävda' },
];

const CATEGORY_LABELS: Record<string, string> = {
  cosmetic: 'Kosmetisk',
  'cosmetic:avatar': 'Avatar',
  'cosmetic:avatar_frame': 'Avatarram',
  'cosmetic:background': 'Bakgrund',
  'cosmetic:title': 'Titel',
  'cosmetic:badge': 'Märke',
  powerup: 'Power-up',
  'powerup:hint': 'Ledtråd',
  'powerup:skip': 'Hoppa över',
  'powerup:time_extend': 'Förläng tid',
  'powerup:double_xp': 'Dubblad XP',
  'powerup:shield': 'Sköld',
  bundle: 'Paket',
  season_pass: 'Season Pass',
};

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
      showNotification('error', 'Kunde inte hämta shop items');
    }
  }, [tenantId, page, pageSize, debouncedSearch, categoryFilter, availabilityFilter, featuredFilter, showNotification]);

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
    showNotification('success', 'Shop item sparat');
  };

  const handleToggleAvailability = async (item: ShopItemRow) => {
    const result = await toggleShopItemAvailability(tenantId, item.id, !item.is_available);
    if (result.success) {
      fetchData();
      showNotification('success', item.is_available ? 'Dolt från shopen' : 'Synligt i shopen');
    } else {
      showNotification('error', result.error || 'Kunde inte uppdatera');
    }
  };

  const handleToggleFeatured = async (item: ShopItemRow) => {
    const result = await toggleShopItemFeatured(tenantId, item.id, !item.is_featured);
    if (result.success) {
      fetchData();
      showNotification('success', item.is_featured ? 'Borttagen från framhävda' : 'Tillagd som framhävd');
    } else {
      showNotification('error', result.error || 'Kunde inte uppdatera');
    }
  };

  const handleDuplicate = async (item: ShopItemRow) => {
    const result = await duplicateShopItem(tenantId, item.id);
    if (result.success) {
      fetchData();
      showNotification('success', `"${item.name}" duplicerat`);
    } else {
      showNotification('error', result.error || 'Kunde inte duplicera');
    }
  };

  const handleDelete = async (item: ShopItemRow) => {
    setConfirmData({ type: 'delete', item });
    setPendingConfirmAction(() => async () => {
      const result = await deleteShopItem(tenantId, item.id);
      if (result.success) {
        fetchData();
        showNotification('success', 'Shop item borttaget');
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

  const handleBulkHide = async (selectedItems: ShopItemRow[]) => {
    const ids = selectedItems.map((i) => i.id);
    const result = await bulkToggleAvailability(tenantId, ids, false);
    if (result.success) {
      selection.clearSelection();
      fetchData();
      showNotification('success', `${result.updatedCount} items dolda`);
    } else {
      showNotification('error', result.error || 'Kunde inte dölja');
    }
  };

  const handleBulkShow = async (selectedItems: ShopItemRow[]) => {
    const ids = selectedItems.map((i) => i.id);
    const result = await bulkToggleAvailability(tenantId, ids, true);
    if (result.success) {
      selection.clearSelection();
      fetchData();
      showNotification('success', `${result.updatedCount} items synliga`);
    } else {
      showNotification('error', result.error || 'Kunde inte visa');
    }
  };

  // Bulk actions
  const bulkActions = [
    {
      id: 'show',
      label: 'Visa i shop',
      icon: <EyeIcon className="h-4 w-4" />,
      onAction: handleBulkShow,
    },
    {
      id: 'hide',
      label: 'Dölj från shop',
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
      header: 'Namn',
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
                <SparklesIcon className="h-4 w-4 text-yellow-500" title="Framhävd" />
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
      header: 'Kategori',
      accessor: 'category' as keyof ShopItemRow,
      width: 'w-32',
      cell: (row: ShopItemRow) => (
        <Badge variant={CATEGORY_COLORS[getCategoryMainType(row.category)] || 'outline'}>
          {getCategoryLabel(row.category)}
        </Badge>
      ),
    },
    {
      header: 'Pris',
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
      header: 'Försäljning',
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
      header: 'Status',
      accessor: 'is_available' as keyof ShopItemRow,
      width: 'w-28',
      cell: (row: ShopItemRow) => (
        <Badge variant={row.is_available ? 'success' : 'outline'}>
          {row.is_available ? 'Tillgänglig' : 'Dold'}
        </Badge>
      ),
    },
    {
      header: 'Åtgärder',
      accessor: 'id' as keyof ShopItemRow,
      width: 'w-44',
      align: 'right' as const,
      cell: (row: ShopItemRow) => (
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
            onClick={(e) => { e.stopPropagation(); handleToggleAvailability(row); }}
            title={row.is_available ? 'Dölj' : 'Visa'}
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
            title={row.is_featured ? 'Ta bort framhävning' : 'Framhäv'}
            className={row.is_featured ? 'text-yellow-500' : ''}
          >
            <SparklesIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDuplicate(row); }}
            title="Duplicera"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </Button>
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
          { label: 'Shop & Rewards' },
        ]}
      />

      <AdminPageHeader
        title="Shop & Rewards"
        description={`Hantera butik och belöningar för ${tenantName}.`}
        actions={
          <Button onClick={handleCreate} disabled={currencies.length === 0}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Lägg till item
          </Button>
        }
      />

      {/* Currency Warning */}
      {currencies.length === 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <ExclamationCircleIcon className="h-5 w-5" />
          Du behöver skapa minst en valuta innan du kan lägga till shop items.
          <a href="/admin/gamification/currency" className="underline font-medium">
            Gå till Valuta →
          </a>
        </div>
      )}

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt items"
          value={stats.totalItems}
          icon={<ShoppingBagIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Tillgängliga"
          value={stats.availableItems}
          icon={<TagIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Totalt sålt"
          value={stats.totalSold.toLocaleString()}
          icon={<GiftIcon className="h-5 w-5" />}
          iconColor="blue"
        />
        <AdminStatCard
          label="Total intäkt"
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
        searchPlaceholder="Sök shop items..."
        filters={
          <>
            <AdminFilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_OPTIONS}
              label="Kategori"
            />
            <AdminFilterSelect
              value={availabilityFilter}
              onChange={setAvailabilityFilter}
              options={AVAILABILITY_OPTIONS}
              label="Tillgänglighet"
            />
            <AdminFilterSelect
              value={featuredFilter}
              onChange={setFeaturedFilter}
              options={FEATURED_OPTIONS}
              label="Framhävd"
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
          title="Inga shop items"
          description={
            search || categoryFilter !== 'all' || availabilityFilter !== 'all' || featuredFilter !== 'all'
              ? 'Inga shop items matchar dina filter.'
              : 'Skapa ditt första shop item för att komma igång.'
          }
          action={
            !search && categoryFilter === 'all' && availabilityFilter === 'all' && featuredFilter === 'all' && currencies.length > 0
              ? { label: 'Lägg till item', onClick: handleCreate }
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
        title="Ta bort shop item"
        description={`Är du säker på att du vill ta bort "${confirmData?.item?.name}"? Detta kan inte ångras om det inte finns köp.`}
        confirmLabel="Ta bort"
        variant="danger"
        onConfirm={handleConfirmAction}
      />
    </AdminPageLayout>
  );
}
