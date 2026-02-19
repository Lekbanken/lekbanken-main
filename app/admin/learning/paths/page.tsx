'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapIcon,
  GlobeAltIcon,
  BuildingOffice2Icon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from '@/components/admin/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  listPaths,
  listTenantsForLearningAdmin,
  checkIsSystemAdmin,
  deletePath,
  type LearningPathRow,
  type LearningPathListResult,
  type TenantOption,
} from '@/app/actions/learning-admin';
import { PathEditorDrawer } from './PathEditorDrawer';

export default function AdminPathsPage() {
  const t = useTranslations('admin.learning.paths');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LearningPathListResult | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  const statusConfig = useMemo(() => ({
    draft: { label: t('status.draft'), variant: 'outline' as const },
    active: { label: t('status.active'), variant: 'default' as const },
    archived: { label: t('status.archived'), variant: 'secondary' as const },
  }), [t]);

  const kindLabels: Record<string, string> = useMemo(() => ({
    onboarding: t('kinds.onboarding'),
    role: t('kinds.role'),
    theme: t('kinds.theme'),
    compliance: t('kinds.compliance'),
  }), [t]);

  // Editor drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPathRow | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'archived'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'tenant'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [isAdmin, tenantData] = await Promise.all([
          checkIsSystemAdmin(),
          listTenantsForLearningAdmin(),
        ]);
        setIsSystemAdmin(isAdmin);
        setTenants(tenantData.tenants);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Load paths
  const loadPaths = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPaths({
        page,
        pageSize,
        search: searchDebounced || undefined,
        status: statusFilter,
        scope: isSystemAdmin ? scopeFilter : 'all',
        tenantId: tenantFilter || undefined,
      });
      setResult(data);
    } catch (err) {
      console.error('Failed to load paths:', err);
      setError(err instanceof Error ? err.message : t('error.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchDebounced, statusFilter, scopeFilter, tenantFilter, isSystemAdmin, t]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  const handleCreateClick = () => {
    setEditingPath(null);
    setDrawerOpen(true);
  };

  const handleEditClick = (path: LearningPathRow) => {
    setEditingPath(path);
    setDrawerOpen(true);
  };

  const handleDeleteClick = async (path: LearningPathRow) => {
    if (!confirm(t('confirmDelete', { title: path.title }))) return;
    
    const result = await deletePath(path.id);
    if (result.success) {
      loadPaths();
    } else {
      setError(result.error || t('error.deleteFailed'));
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingPath(null);
  };

  const handleDrawerSave = () => {
    setDrawerOpen(false);
    setEditingPath(null);
    loadPaths();
  };

  const paths = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.learning'), href: '/admin/learning' },
          { label: t('breadcrumbs.paths'), href: '/admin/learning/paths' },
        ]}
      />

      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<MapIcon className="h-8 w-8" />}
        actions={
          isSystemAdmin ? (
            <Button onClick={handleCreateClick}>
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('actions.create')}
            </Button>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <InformationCircleIcon className="h-4 w-4" />
              {t('actions.readOnly')}
            </Badge>
          )
        }
      />

      {/* Info for non-system admins */}
      {!isSystemAdmin && (
        <Card className="mt-6 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <InformationCircleIcon className="h-5 w-5 shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{t('notice.title')}</p>
                <p className="mt-1 text-muted-foreground">
                  {t('notice.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{result?.totalCount ?? '—'}</p>
            <p className="text-sm text-muted-foreground">{t('stats.total')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">
              {paths.filter(p => p.status === 'active').length}
            </p>
            <p className="text-sm text-muted-foreground">{t('stats.active')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">
              {paths.filter(p => p.status === 'draft').length}
            </p>
            <p className="text-sm text-muted-foreground">{t('stats.draft')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          options={[
            { value: 'all', label: t('filters.status.all') },
            { value: 'draft', label: t('status.draft') },
            { value: 'active', label: t('status.active') },
            { value: 'archived', label: t('status.archived') },
          ]}
        />

        {isSystemAdmin && (
          <>
            <Select
              value={scopeFilter}
              onChange={(e) => {
                setScopeFilter(e.target.value as typeof scopeFilter);
                setPage(1);
              }}
              options={[
                { value: 'all', label: t('filters.scope.all') },
                { value: 'global', label: t('filters.scope.global') },
                { value: 'tenant', label: t('filters.scope.tenant') },
              ]}
            />

            {(scopeFilter === 'tenant' || scopeFilter === 'all') && (
              <Select
                value={tenantFilter}
                onChange={(e) => {
                  setTenantFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: t('filters.tenants.all') },
                  ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })),
                ]}
              />
            )}
          </>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !result && (
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="text-muted-foreground">{t('loading')}</div>
        </div>
      )}

      {/* Path Cards */}
      {result && (
        <div className="mt-6 space-y-4">
          {paths.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MapIcon className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">{t('empty.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchDebounced || statusFilter !== 'all' 
                    ? t('empty.filtered')
                    : t('empty.default')}
                </p>
              </CardContent>
            </Card>
          ) : (
            paths.map((path) => {
              const statusInfo = statusConfig[path.status];
              const isGlobal = path.tenant_id === null;

              return (
                <Card key={path.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                          <MapIcon className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-lg">{path.title}</CardTitle>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            {isGlobal ? (
                              <Badge variant="secondary" className="gap-1">
                                <GlobeAltIcon className="h-3 w-3" />
                                {t('badges.global')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <BuildingOffice2Icon className="h-3 w-3" />
                                {path.tenant_name || t('badges.organization')}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {kindLabels[path.kind] || path.kind}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{path.description || t('emptyValue')}</p>
                        </div>
                      </div>
                      {isSystemAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(path)}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(path)}
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">{path.node_count || 0}</span> {t('stats.nodesLabel')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {result && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('pagination.showing', {
              start: (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, result.totalCount),
              total: result.totalCount,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Path Editor Drawer */}
      <PathEditorDrawer
        open={drawerOpen}
        path={editingPath}
        tenants={tenants}
        onClose={handleDrawerClose}
        onSave={handleDrawerSave}
      />
    </AdminPageLayout>
  );
}
