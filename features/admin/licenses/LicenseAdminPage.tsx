'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  KeyIcon,
  UserIcon,
  BuildingOffice2Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminPagination,
  AdminEmptyState,
} from '@/components/admin/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  useToast,
  Select,
} from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type { LicenseListItem, LicenseStats, LicenseFilterType } from './types';
import { GrantPersonalLicenseDialog } from './components/GrantPersonalLicenseDialog';

// ============================================================================
// CONSTANTS
// ============================================================================

const _DEFAULT_PAGE_SIZE = 25;

const STATUS_VARIANTS: Record<string, 'success' | 'secondary' | 'destructive' | 'warning'> = {
  active: 'success',
  inactive: 'secondary',
  revoked: 'destructive',
  expired: 'warning',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function LicenseRow({ license, t }: { license: LicenseListItem; t: (key: string) => string }) {
  const isPrivate = license.tenantType === 'private';
  
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
      {/* Icon */}
      <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
        isPrivate ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
      }`}>
        {isPrivate ? <UserIcon className="h-5 w-5" /> : <BuildingOffice2Icon className="h-5 w-5" />}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {isPrivate && license.ownerName ? license.ownerName : license.tenantName}
          </span>
          <Badge variant={isPrivate ? 'default' : 'secondary'} className="text-xs">
            {isPrivate ? t('type.private') : t('type.organization')}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {isPrivate && license.ownerEmail ? (
            <span>{license.ownerEmail}</span>
          ) : (
            <span>{license.tenantName}</span>
          )}
        </div>
      </div>

      {/* Product */}
      <div className="hidden md:block flex-shrink-0 w-40">
        <div className="text-sm font-medium truncate">{license.productName}</div>
        <div className="text-xs text-muted-foreground">{license.productSlug}</div>
      </div>

      {/* Seats */}
      <div className="hidden sm:block flex-shrink-0 w-24 text-center">
        <div className="text-sm font-medium">
          {license.assignedSeats}/{license.quantitySeats}
        </div>
        <div className="text-xs text-muted-foreground">{t('seats')}</div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <Badge variant={STATUS_VARIANTS[license.status] || 'secondary'}>
          {t(`status.${license.status}`)}
        </Badge>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface LicenseAdminPageProps {
  initialData: {
    licenses: LicenseListItem[];
    stats: LicenseStats;
    page: number;
    totalCount: number;
  };
}

export function LicenseAdminPage({ initialData }: LicenseAdminPageProps) {
  const t = useTranslations('admin.licenses');
  const { success } = useToast();
  const { can } = useRbac();

  // State
  const [licenses, setLicenses] = useState(initialData.licenses);
  const [stats, setStats] = useState(initialData.stats);
  const [page, setPage] = useState(initialData.page);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [error, setError] = useState<string | null>(null);
  const [_isRefreshing, startRefresh] = useTransition();
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LicenseFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Fetch licenses when filters change
  const refreshLicenses = useCallback(async () => {
    startRefresh(async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (typeFilter !== 'all') params.set('type', typeFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        params.set('page', String(page));

        const res = await fetch(`/api/admin/licenses?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch licenses');
        
        const data = await res.json();
        setLicenses(data.licenses);
        setStats(data.stats);
        setTotalCount(data.totalCount);
        setError(null);
      } catch (err) {
        console.error('[LicenseAdminPage] Refresh error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    });
  }, [debouncedSearch, typeFilter, statusFilter, page]);

  // Refresh when filters change
  useEffect(() => {
    refreshLicenses();
  }, [debouncedSearch, typeFilter, statusFilter, page, refreshLicenses]);

  // Handle grant success
  const handleGrantSuccess = useCallback(() => {
    success(t('grantSuccess'));
    setGrantDialogOpen(false);
    refreshLicenses();
  }, [success, t, refreshLicenses]);

  // Permissions
  const canGrantLicense = can('admin.licenses.grant');

  // Breadcrumbs
  const breadcrumbs = [
    { label: t('breadcrumbs.admin'), href: '/admin' },
    { label: t('breadcrumbs.licenses') },
  ];

  // Page actions
  const actions = canGrantLicense ? (
    <Button onClick={() => setGrantDialogOpen(true)}>
      <PlusIcon className="h-4 w-4 mr-2" />
      {t('grantButton')}
    </Button>
  ) : null;

  const totalPages = Math.ceil(totalCount / _DEFAULT_PAGE_SIZE);

  // Filter options
  const typeOptions = [
    { value: 'all', label: t('filter.typeAll') },
    { value: 'private', label: t('filter.typePrivate') },
    { value: 'organization', label: t('filter.typeOrganization') },
  ];

  const statusOptions = [
    { value: 'all', label: t('filter.statusAll') },
    { value: 'active', label: t('filter.statusActive') },
    { value: 'inactive', label: t('filter.statusInactive') },
    { value: 'revoked', label: t('filter.statusRevoked') },
    { value: 'expired', label: t('filter.statusExpired') },
  ];

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={actions}
      />

      {/* Stats */}
      <AdminStatGrid>
        <AdminStatCard
          label={t('stats.total')}
          value={stats.total}
          icon={<KeyIcon className="h-5 w-5" />}
        />
        <AdminStatCard
          label={t('stats.active')}
          value={stats.active}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label={t('stats.private')}
          value={stats.private}
          icon={<UserIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label={t('stats.organization')}
          value={stats.organization}
          icon={<BuildingOffice2Icon className="h-5 w-5" />}
          iconColor="purple"
        />
      </AdminStatGrid>

      {/* Filters */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('filter.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type filter */}
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LicenseFilterType)}
              options={typeOptions}
              className="w-[180px]"
            />

            {/* Status filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              className="w-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mt-6 border-destructive">
          <CardContent className="p-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card className="mt-6">
        <CardContent className="p-0">
          {licenses.length === 0 ? (
            <AdminEmptyState
              title={t('noLicenses')}
              description={t('noLicensesHint')}
              icon={<KeyIcon className="h-12 w-12" />}
            />
          ) : (
            <div className="divide-y divide-border">
              {licenses.map((license) => (
                <LicenseRow key={license.id} license={license} t={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Grant Dialog */}
      <GrantPersonalLicenseDialog
        open={grantDialogOpen}
        onOpenChange={setGrantDialogOpen}
        onSuccess={handleGrantSuccess}
      />
    </AdminPageLayout>
  );
}
