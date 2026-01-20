'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate } from '@/lib/i18n/format-utils';
import { useRouter } from 'next/navigation';
import {
  CubeIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
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
  Input,
  useToast,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type {
  ProductAdminRow,
  ProductFilters,
  ProductListResponse,
  ProductStatus,
  StripeLinkageStatus,
  HealthStatus,
  BulkOperationResult,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 25;

// Status variant mappings (non-translatable)
const STATUS_VARIANTS: Record<ProductStatus, 'default' | 'secondary' | 'destructive' | 'warning' | 'accent' | 'success' | 'outline'> = {
  active: 'success',
  inactive: 'secondary',
  draft: 'warning',
  archived: 'secondary',
};

const STRIPE_LINKAGE_VARIANTS: Record<StripeLinkageStatus, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  connected: 'default',
  missing: 'warning',
  drift: 'destructive',
  error: 'destructive',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status, label }: { status: ProductStatus; label: string }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{label}</Badge>;
}

function StripeLinkageBadge({ status, label }: { status: StripeLinkageStatus; label: string }) {
  const Icon = status === 'connected' ? CheckCircleIcon : status === 'drift' ? ExclamationTriangleIcon : XCircleIcon;

  return (
    <Badge variant={STRIPE_LINKAGE_VARIANTS[status]} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function HealthBadge({ status, label }: { status: HealthStatus; label: string }) {
  const Icon = status === 'ok' ? CheckCircleIcon : ExclamationTriangleIcon;

  return (
    <Badge
      variant={status === 'ok' ? 'default' : 'destructive'}
      className="gap-1 h-6 w-6 p-0 justify-center"
      title={label}
    >
      <Icon className="h-3 w-3" />
    </Badge>
  );
}

// ============================================================================
// FILTER BAR
// ============================================================================

type FilterBarProps = {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
};

function FilterBar({ filters, onChange }: FilterBarProps) {
  const t = useTranslations('admin.products.v2');
  
  const quickFilters: Array<{ key: string; label: string; filter: Partial<ProductFilters> }> = useMemo(() => [
    { key: 'active', label: t('filters.active'), filter: { statuses: ['active'] } },
    { key: 'draft', label: t('filters.draft'), filter: { statuses: ['draft'] } },
    { key: 'missing-stripe', label: t('filters.missingStripe'), filter: { stripeLinkageStatuses: ['missing'] } },
    { key: 'drift', label: t('filters.drift'), filter: { stripeLinkageStatuses: ['drift'] } },
    { key: 'unhealthy', label: t('filters.unhealthy'), filter: { healthStatuses: ['missing_fields', 'stripe_drift', 'no_price', 'availability_misconfig'] } },
  ], [t]);

  const isQuickFilterActive = (key: string): boolean => {
    const f = quickFilters.find((qf) => qf.key === key);
    if (!f) return false;

    if (f.filter.statuses && JSON.stringify(filters.statuses) === JSON.stringify(f.filter.statuses)) {
      return true;
    }
    if (f.filter.stripeLinkageStatuses && JSON.stringify(filters.stripeLinkageStatuses) === JSON.stringify(f.filter.stripeLinkageStatuses)) {
      return true;
    }
    if (f.filter.healthStatuses && JSON.stringify(filters.healthStatuses) === JSON.stringify(f.filter.healthStatuses)) {
      return true;
    }
    return false;
  };

  const handleQuickFilter = (key: string) => {
    const f = quickFilters.find((qf) => qf.key === key);
    if (!f) return;

    if (isQuickFilterActive(key)) {
      // Clear the filter
      onChange({
        ...filters,
        statuses: undefined,
        stripeLinkageStatuses: undefined,
        healthStatuses: undefined,
        page: 1,
      });
    } else {
      // Apply the filter
      onChange({
        ...filters,
        statuses: undefined,
        stripeLinkageStatuses: undefined,
        healthStatuses: undefined,
        ...f.filter,
        page: 1,
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[240px]">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('filters.searchPlaceholder')}
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
          className="pl-9"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((qf) => (
          <Button
            key={qf.key}
            variant={isQuickFilterActive(qf.key) ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFilter(qf.key)}
          >
            {qf.label}
          </Button>
        ))}
      </div>

      {/* Filter Button */}
      <Button variant="outline" size="sm">
        <FunnelIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// BULK ACTIONS BAR
// ============================================================================

type BulkActionsBarProps = {
  selectedCount: number;
  selectedIds: string[];
  onClear: () => void;
  onSelectAll: () => void;
  allSelected: boolean;
  totalCount: number;
  onActionComplete: (result: BulkOperationResult) => void;
};

function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClear,
  onSelectAll,
  allSelected,
  totalCount,
  onActionComplete,
}: BulkActionsBarProps) {
  const t = useTranslations('admin.products.v2');
  const { success, warning } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkAction = async (action: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: action,
          product_ids: selectedIds,
        }),
      });

      if (!res.ok) throw new Error('Bulk operation failed');

      const result: BulkOperationResult = await res.json();
      success(t('bulk.actionSuccess', { count: result.processed }));
      onActionComplete(result);
    } catch {
      warning(t('bulk.actionFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {t('bulk.selected', { count: selectedCount, total: totalCount })}
            </span>
            <Button variant="ghost" size="sm" onClick={onClear}>
              {t('bulk.clear')}
            </Button>
            {!allSelected && (
              <Button variant="ghost" size="sm" onClick={onSelectAll}>
                {t('bulk.selectAll')}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleBulkAction('activate')}
            >
              <CheckCircleIcon className="mr-1.5 h-4 w-4" />
              {t('bulk.activate')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleBulkAction('archive')}
            >
              <ArchiveBoxIcon className="mr-1.5 h-4 w-4" />
              {t('bulk.archive')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleBulkAction('sync_stripe')}
            >
              <ArrowPathIcon className="mr-1.5 h-4 w-4" />
              {t('bulk.syncStripe')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleBulkAction('validate')}
            >
              <CheckCircleIcon className="mr-1.5 h-4 w-4" />
              {t('bulk.validate')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleBulkAction('export')}
            >
              <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" />
              {t('bulk.export')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PRODUCT TABLE ROW
// ============================================================================

type ProductRowProps = {
  product: ProductAdminRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenCard: () => void;
  canEdit: boolean;
  labels: {
    statusLabels: Record<string, string>;
    typeLabels: Record<string, string>;
    stripeLinkageLabels: Record<string, string>;
    healthLabels: Record<string, string>;
    selectProduct: (name: string) => string;
    viewProduct: string;
    syncWithStripe: string;
  };
};

function ProductRow({
  product,
  isSelected,
  onToggleSelect,
  onOpenCard,
  canEdit,
  labels,
}: ProductRowProps) {
  const primaryPrice = product.primary_price;

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
          aria-label={labels.selectProduct(product.name)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
      </td>

      {/* Icon */}
      <td className="w-12 px-2 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CubeIcon className="h-5 w-5" />
        </div>
      </td>

      {/* Name & Description */}
      <td className="px-3 py-3 min-w-[200px]">
        <div className="flex flex-col">
          <span className="font-medium text-sm truncate max-w-[300px]">
            {product.name}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {product.internal_description || '—'}
          </span>
        </div>
      </td>

      {/* Product Key */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
          {product.product_key || product.id.slice(0, 8)}
        </code>
      </td>

      {/* Type */}
      <td className="px-3 py-3 hidden md:table-cell">
        <Badge variant="outline" className="text-xs">
          {labels.typeLabels[product.product_type] || product.product_type}
        </Badge>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={product.status} label={labels.statusLabels[product.status] || product.status} />
      </td>

      {/* Pricing */}
      <td className="px-3 py-3 hidden xl:table-cell">
        {primaryPrice ? (
          <span className="text-sm font-medium">
            {formatCurrency(primaryPrice.amount, primaryPrice.currency)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Stripe Linkage */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <StripeLinkageBadge 
          status={product.stripe_linkage.status} 
          label={labels.stripeLinkageLabels[product.stripe_linkage.status] || product.stripe_linkage.status}
        />
      </td>

      {/* Availability */}
      <td className="px-3 py-3 hidden xl:table-cell">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <BuildingOfficeIcon className="h-4 w-4" />
          <span>{product.assigned_tenants_count}</span>
        </div>
      </td>

      {/* Health */}
      <td className="px-3 py-3 hidden md:table-cell">
        <HealthBadge 
          status={product.health_status} 
          label={labels.healthLabels[product.health_status] || product.health_status}
        />
      </td>

      {/* Updated */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">
          {formatDate(product.updated_at)}
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
            <DropdownMenuItem onClick={onOpenCard}>
              <CubeIcon className="h-4 w-4 mr-2" />
              {labels.viewProduct}
            </DropdownMenuItem>
            {canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  {labels.syncWithStripe}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

// ============================================================================
// SELECTION HOOK
// ============================================================================

function useBulkSelection(products: ProductAdminRow[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((product: ProductAdminRow) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.add(product.id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback(
    (product: ProductAdminRow) => selectedIds.has(product.id),
    [selectedIds]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const selectedCount = selectedIds.size;
  const selectedItems = products.filter((p) => selectedIds.has(p.id));
  const selectedIdsArray = Array.from(selectedIds);

  return {
    toggle,
    isSelected,
    selectAll,
    clearSelection,
    allSelected,
    selectedCount,
    selectedItems,
    selectedIds: selectedIdsArray,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductAdminPageV2() {
  const t = useTranslations('admin.products.v2');
  const { can } = useRbac();
  const router = useRouter();

  // Create labels object for ProductRow
  const productRowLabels = useMemo(() => ({
    statusLabels: {
      active: t('status.active'),
      inactive: t('status.inactive'),
      draft: t('status.draft'),
      archived: t('status.archived'),
    },
    typeLabels: {
      license: t('type.license'),
      module: t('type.module'),
      addon: t('type.addon'),
      usage_based: t('type.usage_based'),
      one_time: t('type.one_time'),
      subscription: t('type.subscription'),
    },
    stripeLinkageLabels: {
      connected: t('stripeLinkage.connected'),
      missing: t('stripeLinkage.missing'),
      drift: t('stripeLinkage.drift'),
      error: t('stripeLinkage.error'),
    },
    healthLabels: {
      ok: t('health.ok'),
      missing_fields: t('health.missing_fields'),
      stripe_drift: t('health.stripe_drift'),
      availability_misconfig: t('health.availability_misconfig'),
      no_price: t('health.no_price'),
    },
    selectProduct: (name: string) => t('table.selectProduct', { name }),
    viewProduct: t('table.viewProduct'),
    syncWithStripe: t('table.syncWithStripe'),
  }), [t]);

  // State
  const [products, setProducts] = useState<ProductAdminRow[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'updated_at',
    sortOrder: 'desc',
  });

  // Selection
  const selection = useBulkSelection(products);

  // Permissions
  const canView = can('admin.products.list');
  const canEdit = can('admin.products.edit');
  const canCreate = can('admin.products.create');

  // Stats
  const stats = useMemo(() => {
    return {
      total: totalProducts,
      active: products.filter((p) => p.status === 'active').length,
      draft: products.filter((p) => p.status === 'draft').length,
      missingStripe: products.filter((p) => p.stripe_linkage.status === 'missing').length,
    };
  }, [products, totalProducts]);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!canView) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/products/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load products');
      }

      const data: ProductListResponse = await response.json();
      setProducts(data.products);
      setTotalProducts(data.total);
    } catch (err) {
      console.error('[ProductAdminPageV2] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [canView, filters]);

  // Initial load
  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Handlers - navigate directly to product detail page instead of using drawer
  const handleOpenCard = useCallback((product: ProductAdminRow) => {
    router.push(`/admin/products/${product.id}`);
  }, [router]);

  const handleFilterChange = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    selection.clearSelection();
  }, [selection]);

  const handleBulkActionComplete = useCallback((result: BulkOperationResult) => {
    if (result.success) {
      void loadProducts();
      selection.clearSelection();
    }
  }, [loadProducts, selection]);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // Permission check
  if (!canView) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<CubeIcon className="h-6 w-6" />}
          title={t('noAccess.title')}
          description={t('noAccess.description')}
        />
      </AdminPageLayout>
    );
  }

  const totalPages = Math.ceil(totalProducts / (filters.pageSize || DEFAULT_PAGE_SIZE));

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[{ label: t('breadcrumbs.home'), href: '/admin' }, { label: t('breadcrumbs.products') }]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<CubeIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              {t('actions.export')}
            </Button>
            <Button variant="outline" size="sm" disabled>
              <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
              {t('actions.import')}
            </Button>
            {canCreate && (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/admin/products/new')}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                {t('actions.newProduct')}
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <AdminErrorState
          title={t('error.loadFailed')}
          description={error}
          onRetry={() => void loadProducts()}
        />
      )}

      {/* Stats */}
      <AdminStatGrid className="mb-4">
        <AdminStatCard label={t('stats.total')} value={stats.total} />
        <AdminStatCard label={t('stats.active')} value={stats.active} />
        <AdminStatCard label={t('stats.draft')} value={stats.draft} />
        <AdminStatCard label={t('stats.missingStripe')} value={stats.missingStripe} />
      </AdminStatGrid>

      {/* Bulk Actions Bar */}
      {selection.selectedCount > 0 && (
        <div className="mb-4">
          <BulkActionsBar
            selectedCount={selection.selectedCount}
            selectedIds={selection.selectedIds}
            onClear={selection.clearSelection}
            onSelectAll={selection.selectAll}
            allSelected={selection.allSelected}
            totalCount={totalProducts}
            onActionComplete={handleBulkActionComplete}
          />
        </div>
      )}

      {/* Main Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle>{t('table.title')}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Filter Bar */}
          <div className="px-6 py-4 border-b border-border">
            <FilterBar filters={filters} onChange={handleFilterChange} />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : products.length === 0 ? (
            <AdminEmptyState
              icon={<CubeIcon className="h-6 w-6" />}
              title={t('empty.title')}
              description={t('empty.description')}
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
                      {t('table.name')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                      {t('table.key')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                      {t('table.type')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      {t('table.status')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden xl:table-cell">
                      {t('table.price')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                      {t('table.stripe')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden xl:table-cell">
                      {t('table.orgs')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                      {t('table.health')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                      {t('table.updated')}
                    </th>
                    <th className="w-10 px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isSelected={selection.isSelected(product)}
                      onToggleSelect={() => selection.toggle(product)}
                      onOpenCard={() => handleOpenCard(product)}
                      canEdit={canEdit}
                      labels={productRowLabels}
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
                totalItems={totalProducts}
                itemsPerPage={filters.pageSize || DEFAULT_PAGE_SIZE}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
