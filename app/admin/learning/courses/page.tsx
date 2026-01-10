'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  BuildingOffice2Icon,
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
import { Card, CardContent } from '@/components/ui/card';
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
  listCourses,
  setCourseStatus,
  listTenantsForLearningAdmin,
  checkIsSystemAdmin,
  getUserAdminTenantIds,
  type LearningCourseRow,
  type LearningCourseListResult,
  type TenantOption,
} from '@/app/actions/learning-admin';
import { CourseEditorDrawer } from './CourseEditorDrawer';

const statusConfig = {
  draft: { label: 'Utkast', variant: 'outline' as const },
  active: { label: 'Aktiv', variant: 'default' as const },
  archived: { label: 'Arkiverad', variant: 'secondary' as const },
};

const difficultyLabels: Record<string, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Medel',
  advanced: 'Avancerad',
  expert: 'Expert',
};

export default function AdminCoursesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LearningCourseListResult | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [userTenantIds, setUserTenantIds] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'archived'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'tenant'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Editor drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<LearningCourseRow | null>(null);

  // Archive confirmation
  const { isOpen: confirmOpen, setIsOpen: setConfirmOpen, handleConfirm: handleDialogConfirm } = useConfirmDialog();
  const [confirmCourse, setConfirmCourse] = useState<LearningCourseRow | null>(null);
  const [isArchiving, startArchiving] = useTransition();

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

  // Load courses
  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listCourses({
        page,
        pageSize,
        search: searchDebounced || undefined,
        status: statusFilter,
        scope: isSystemAdmin ? scopeFilter : 'all',
        tenantId: tenantFilter || undefined,
      });
      setResult(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError(err instanceof Error ? err.message : 'Kunde inte hämta kurser');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchDebounced, statusFilter, scopeFilter, tenantFilter, isSystemAdmin]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCreateNew = () => {
    setEditingCourse(null);
    setDrawerOpen(true);
  };

  const handleEdit = (course: LearningCourseRow) => {
    setEditingCourse(course);
    setDrawerOpen(true);
  };

  const handleArchive = (course: LearningCourseRow) => {
    setConfirmCourse(course);
    setConfirmOpen(true);
  };

  const confirmArchive = () => {
    if (!confirmCourse) return;
    
    startArchiving(async () => {
      const result = await setCourseStatus(confirmCourse.id, 'archived');
      if (result.success) {
        setConfirmOpen(false);
        setConfirmCourse(null);
        loadCourses();
      } else {
        alert(result.error || 'Kunde inte arkivera kursen');
      }
    });
  };

  const handleDrawerSave = () => {
    setDrawerOpen(false);
    setEditingCourse(null);
    loadCourses();
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingCourse(null);
  };

  const courses = result?.data ?? [];
  const stats = result?.stats ?? { total: 0, active: 0, draft: 0, archived: 0 };
  const totalPages = result?.totalPages ?? 1;

  // Determine current tenant for non-system admins
  const currentTenantId = !isSystemAdmin && userTenantIds.length > 0 ? userTenantIds[0] : undefined;

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Utbildning', href: '/admin/learning' },
          { label: 'Kurser', href: '/admin/learning/courses' },
        ]}
      />

      <AdminPageHeader
        title="Kurser"
        description="Skapa och hantera utbildningskurser"
        icon={<BookOpenIcon className="h-8 w-8" />}
        actions={
          <Button onClick={handleCreateNew}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Ny kurs
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Totalt kurser</p>
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
            <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
            <p className="text-sm text-muted-foreground">Utkast</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">{stats.archived}</p>
            <p className="text-sm text-muted-foreground">Arkiverade</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök kurser..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="all">Alla statusar</option>
          <option value="draft">Utkast</option>
          <option value="active">Aktiv</option>
          <option value="archived">Arkiverad</option>
        </select>

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
          <div className="text-muted-foreground">Laddar kurser...</div>
        </div>
      )}

      {/* Courses Table */}
      {result && (
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Kurs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nivå</TableHead>
                  <TableHead>Tid</TableHead>
                  <TableHead>Godkänt</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchDebounced || statusFilter !== 'all' ? 'Inga kurser matchar filtren' : 'Inga kurser ännu'}
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map((course) => {
                    const statusInfo = statusConfig[course.status];
                    const isGlobal = course.tenant_id === null;
                    const canEdit = isSystemAdmin || (!isGlobal && userTenantIds.includes(course.tenant_id!));

                    return (
                      <TableRow key={course.id}>
                        <TableCell>
                          {isGlobal ? (
                            <Badge variant="secondary" className="gap-1">
                              <GlobeAltIcon className="h-3 w-3" />
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <BuildingOffice2Icon className="h-3 w-3" />
                              {course.tenant_name || 'Organisation'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {course.description || course.slug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {course.difficulty ? difficultyLabels[course.difficulty] || course.difficulty : '—'}
                        </TableCell>
                        <TableCell>
                          {course.duration_minutes ? `${course.duration_minutes} min` : '—'}
                        </TableCell>
                        <TableCell>{course.pass_score}%</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(course)}
                              disabled={!canEdit}
                              title={canEdit ? 'Redigera' : 'Endast visning'}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            {course.status !== 'archived' && canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(course)}
                                title="Arkivera"
                              >
                                <ArchiveBoxIcon className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* Course Editor Drawer */}
      <CourseEditorDrawer
        open={drawerOpen}
        course={editingCourse}
        tenants={tenants}
        isSystemAdmin={isSystemAdmin}
        currentTenantId={currentTenantId}
        onClose={handleDrawerClose}
        onSave={handleDrawerSave}
      />

      {/* Archive Confirmation Dialog */}
      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmCourse(null);
        }}
        title="Arkivera kurs"
        description={`Är du säker på att du vill arkivera "${confirmCourse?.title}"? Kursen kommer inte längre vara synlig för deltagare.`}
        confirmLabel="Arkivera"
        cancelLabel="Avbryt"
        onConfirm={confirmArchive}
        isLoading={isArchiving}
        variant="warning"
      />
    </AdminPageLayout>
  );
}
