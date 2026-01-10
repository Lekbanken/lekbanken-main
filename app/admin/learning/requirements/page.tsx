'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
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

const typeConfig: Record<string, { label: string; icon: typeof PuzzlePieceIcon; color: string }> = {
  game_unlock: { label: 'Spelåtkomst', icon: PuzzlePieceIcon, color: 'text-purple-500 bg-purple-500/10' },
  role_unlock: { label: 'Rollkrav', icon: UserGroupIcon, color: 'text-blue-500 bg-blue-500/10' },
  activity_unlock: { label: 'Aktivitetsgrind', icon: PlayIcon, color: 'text-green-500 bg-green-500/10' },
  onboarding_required: { label: 'Onboarding', icon: AcademicCapIcon, color: 'text-amber-500 bg-amber-500/10' },
};

export default function AdminRequirementsPage() {
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
      setError(err instanceof Error ? err.message : 'Kunde inte hämta krav');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchDebounced, scopeFilter, tenantFilter, isSystemAdmin]);

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
        alert(result.error || 'Kunde inte ändra status');
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
        alert(result.error || 'Kunde inte ta bort kravet');
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

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Utbildning', href: '/admin/learning' },
          { label: 'Krav & Grind', href: '/admin/learning/requirements' },
        ]}
      />

      <AdminPageHeader
        title="Krav & Grind"
        description="Konfigurera vilka kurser som krävs för aktiviteter och roller"
        icon={<ShieldCheckIcon className="h-8 w-8" />}
        actions={
          <Button onClick={handleCreateNew}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Nytt krav
          </Button>
        }
      />

      {/* Info card */}
      <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ShieldCheckIcon className="h-5 w-5 shrink-0 text-blue-500" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Hur fungerar krav?</p>
              <p className="mt-1 text-muted-foreground">
                Krav blockerar användare från att utföra vissa aktiviteter eller ta roller tills de har slutfört
                specifika kurser. När en användare försöker göra något som kräver en kurs visas en modal med
                information om vilka kurser som behöver slutföras.
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
            <p className="text-sm text-muted-foreground">Totalt krav</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Aktiva</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
            <p className="text-sm text-muted-foreground">Inaktiva</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök krav..."
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
              <option value="all">Alla scope</option>
              <option value="global">Globala</option>
              <option value="tenant">Organisation</option>
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
                <option value="">Alla organisationer</option>
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
          <div className="text-muted-foreground">Laddar krav...</div>
        </div>
      )}

      {/* Requirements Table */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Alla krav</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Mål</TableHead>
                  <TableHead>Krävd kurs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchDebounced ? 'Inga krav matchar sökningen' : 'Inga krav konfigurerade ännu'}
                    </TableCell>
                  </TableRow>
                ) : (
                  requirements.map((req) => {
                    const typeInfo = typeConfig[req.requirement_type] || typeConfig.game_unlock;
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
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <BuildingOffice2Icon className="h-3 w-3" />
                              {req.tenant_name || 'Organisation'}
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
                              {req.is_active ? 'Aktiv' : 'Inaktiv'}
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
                              title={canEdit ? 'Ta bort' : 'Ingen åtkomst'}
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
            Visar {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, result.totalCount)} av {result.totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Föregående
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Nästa
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
        title="Ta bort krav"
        description="Är du säker på att du vill ta bort detta krav? Användare kommer inte längre blockeras av det."
        confirmLabel="Ta bort"
        cancelLabel="Avbryt"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="danger"
      />
    </AdminPageLayout>
  );
}
