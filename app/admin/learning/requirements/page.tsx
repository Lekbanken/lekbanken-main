'use client';

import { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import {
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
  AdminConfirmDialog,
  useConfirmDialog,
} from '@/components/admin/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  listRequirements,
  toggleRequirementActiveAdmin,
  deleteRequirementAdmin,
  listTenantsForLearningAdmin,
  checkIsSystemAdmin,
  getUserAdminTenantIds,
  type LearningRequirementRow,
  type LearningRequirementListResult,
  type TenantOption,
} from '@/app/actions/learning-admin';
import { RequirementEditorDrawer } from './RequirementEditorDrawer';

type RequirementType = 'game_unlock' | 'role_unlock' | 'activity_unlock' | 'onboarding_required';

export default function AdminRequirementsPage() {
  const t = useTranslations('admin.learning.requirements');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LearningRequirementListResult | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [userTenantIds, setUserTenantIds] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'tenant'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Editor drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Delete confirmation
  const { isOpen: confirmOpen, setIsOpen: setConfirmOpen } = useConfirmDialog();
  const [confirmReq, setConfirmReq] = useState<LearningRequirementRow | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
        const [isAdmin, tenantData, tenantIds] = await Promise.all([
          checkIsSystemAdmin(),
          listTenantsForLearningAdmin(),
          getUserAdminTenantIds(),
        ]);
        setIsSystemAdmin(isAdmin);
        setTenants(tenantData.tenants);
        setUserTenantIds(tenantIds);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Load requirements
  const loadRequirements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listRequirements({
        page,
        pageSize,
        search: searchDebounced || undefined,
        scope: isSystemAdmin ? scopeFilter : 'all',
        tenantId: tenantFilter || undefined,
      });
      setResult(data);
    } catch (err) {
      console.error('Failed to load requirements:', err);
      setError(err instanceof Error ? err.message : t('error.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchDebounced, scopeFilter, tenantFilter, isSystemAdmin, t]);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  const handleCreateNew = () => {
    setDrawerOpen(true);
  };

  const handleToggleActive = async (req: LearningRequirementRow) => {
    setTogglingId(req.id);
    try {
      const result = await toggleRequirementActiveAdmin(req.id, !req.is_active);
      if (result.success) {
        loadRequirements();
      } else {
        alert(result.error || t('error.toggleFailed'));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (req: LearningRequirementRow) => {
    setConfirmReq(req);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!confirmReq) return;
    
    startDeleting(async () => {
      const result = await deleteRequirementAdmin(confirmReq.id);
      if (result.success) {
        setConfirmOpen(false);
        setConfirmReq(null);
        loadRequirements();
      } else {
        alert(result.error || t('error.deleteFailed'));
      }
    });
  };

  const handleDrawerSave = () => {
    setDrawerOpen(false);
    loadRequirements();
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const requirements = result?.data ?? [];
  const stats = result?.stats ?? { total: 0, active: 0, inactive: 0 };
  const totalPages = result?.totalPages ?? 1;

  // Determine current tenant for non-system admins
  const currentTenantId = !isSystemAdmin && userTenantIds.length > 0 ? userTenantIds[0] : undefined;

  // Type config with translations
  const typeConfig = useMemo(() => ({
    game_unlock: { label: t('types.game_unlock'), icon: PuzzlePieceIcon, color: 'text-purple-500 bg-purple-500/10' },
    role_unlock: { label: t('types.role_unlock'), icon: UserGroupIcon, color: 'text-blue-500 bg-blue-500/10' },
    activity_unlock: { label: t('types.activity_unlock'), icon: PlayIcon, color: 'text-green-500 bg-green-500/10' },
    onboarding_required: { label: t('types.onboarding_required'), icon: AcademicCapIcon, color: 'text-amber-500 bg-amber-500/10' },
  }), [t]);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.learning'), href: '/admin/learning' },
          { label: t('breadcrumbs.requirements'), href: '/admin/learning/requirements' },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<ShieldCheckIcon className="h-8 w-8" />}
        actions={
          <Button onClick={handleCreateNew}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('newRequirement')}
          </Button>
        }
      />

      {/* Info card */}
      <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ShieldCheckIcon className="h-5 w-5 shrink-0 text-blue-500" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{t('info.title')}</p>
              <p className="mt-1 text-muted-foreground">
                {t('info.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">{t('stats.total')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">{t('stats.active')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
            <p className="text-sm text-muted-foreground">{t('stats.inactive')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isSystemAdmin && (
          <>
            <select
              value={scopeFilter}
              onChange={(e) => {
                setScopeFilter(e.target.value as typeof scopeFilter);
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">{t('filter.allScopes')}</option>
              <option value="global">{t('filter.global')}</option>
              <option value="tenant">{t('filter.tenant')}</option>
            </select>

            {(scopeFilter === 'tenant' || scopeFilter === 'all') && (
              <select
                value={tenantFilter}
                onChange={(e) => {
                  setTenantFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">{t('filter.allOrganizations')}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
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

      {/* Requirements Table */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('table.title')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.scope')}</TableHead>
                  <TableHead>{t('table.type')}</TableHead>
                  <TableHead>{t('table.target')}</TableHead>
                  <TableHead>{t('table.requiredCourse')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchDebounced ? t('table.noMatchingRequirements') : t('table.noRequirements')}
                    </TableCell>
                  </TableRow>
                ) : (
                  requirements.map((req) => {
                    const typeInfo = typeConfig[req.requirement_type as RequirementType] || typeConfig.game_unlock;
                    const TypeIcon = typeInfo.icon;
                    const isGlobal = req.tenant_id === null;
                    const canEdit = isSystemAdmin || (!isGlobal && userTenantIds.includes(req.tenant_id!));
                    const target = req.target_ref as { kind?: string; id?: string; name?: string };

                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          {isGlobal ? (
                            <Badge variant="secondary" className="gap-1">
                              <GlobeAltIcon className="h-3 w-3" />
                              {t('table.global')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <BuildingOffice2Icon className="h-3 w-3" />
                              {req.tenant_name || t('table.organization')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeInfo.color}`}>
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{typeInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{target?.name || target?.id || '—'}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {target?.kind}:{target?.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{req.course_title || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={req.is_active}
                              onCheckedChange={() => handleToggleActive(req)}
                              disabled={!canEdit || togglingId === req.id}
                            />
                            <Badge variant={req.is_active ? 'default' : 'outline'}>
                              {req.is_active ? t('table.active') : t('table.inactive')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(req)}
                              disabled={!canEdit}
                              title={canEdit ? t('actions.delete') : t('actions.noAccess')}
                            >
                              <TrashIcon className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {result && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('pagination.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, result.totalCount), total: result.totalCount })}
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

      {/* Requirement Editor Drawer */}
      <RequirementEditorDrawer
        open={drawerOpen}
        requirement={null} // Phase 1: create only
        tenants={tenants}
        isSystemAdmin={isSystemAdmin}
        currentTenantId={currentTenantId}
        onClose={handleDrawerClose}
        onSave={handleDrawerSave}
      />

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmReq(null);
        }}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description')}
        confirmLabel={t('deleteDialog.confirm')}
        cancelLabel={t('deleteDialog.cancel')}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="danger"
      />
    </AdminPageLayout>
  );
}
