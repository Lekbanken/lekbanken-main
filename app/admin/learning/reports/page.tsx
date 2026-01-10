'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from '@/components/admin/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getLearningReports,
  checkIsSystemAdmin,
  listTenantsForLearningAdmin,
  type LearningReportsResult,
  type TenantOption,
} from '@/app/actions/learning-admin';

const DAYS_OPTIONS = [
  { value: 7, label: 'Senaste 7 dagarna' },
  { value: 30, label: 'Senaste 30 dagarna' },
  { value: 90, label: 'Senaste 90 dagarna' },
  { value: 365, label: 'Senaste året' },
];

export default function AdminLearningReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LearningReportsResult | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Filters
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'tenant'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [days, setDays] = useState(30);

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

  // Load reports
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLearningReports({
        scope: isSystemAdmin ? scopeFilter : 'all',
        tenantId: tenantFilter || undefined,
        days,
      });
      setResult(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err instanceof Error ? err.message : 'Ett oväntat fel uppstod');
    } finally {
      setIsLoading(false);
    }
  }, [scopeFilter, tenantFilter, days, isSystemAdmin]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const stats = result?.stats;
  const courses = result?.courses ?? [];

  // Calculate some derived stats
  const avgScore = courses.length > 0
    ? courses.reduce((sum, c) => sum + (c.avg_score_30d ?? 0), 0) / courses.filter(c => c.avg_score_30d !== null).length
    : 0;

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Utbildning', href: '/admin/learning' },
          { label: 'Rapporter', href: '/admin/learning/reports' },
        ]}
      />

      <AdminPageHeader
        title="Rapporter"
        description="Analysera utbildningsframsteg och statistik"
        icon={<ChartBarIcon className="h-8 w-8" />}
        actions={
          <Button variant="outline" onClick={loadReports} disabled={isLoading}>
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Uppdatera
          </Button>
        }
      />

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {DAYS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {isSystemAdmin && (
          <>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">Alla scope</option>
              <option value="global">Globala kurser</option>
              <option value="tenant">Organisation</option>
            </select>

            {(scopeFilter === 'tenant' || scopeFilter === 'all') && (
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
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

      {/* Stats Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <UserGroupIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeParticipants ?? '—'}</p>
                <p className="text-sm text-muted-foreground">Aktiva deltagare</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completedCourses ?? '—'}</p>
                <p className="text-sm text-muted-foreground">Avklarade kurser</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <AcademicCapIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.topCourses?.length ?? '—'}</p>
                <p className="text-sm text-muted-foreground">Aktiva kurser</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <ChartBarIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {avgScore ? `${Math.round(avgScore)}%` : '—'}
                </p>
                <p className="text-sm text-muted-foreground">Snittresultat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-course table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Statistik per kurs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !result ? (
            <div className="py-8 text-center text-muted-foreground">
              Laddar statistik...
            </div>
          ) : courses.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Ingen kursstatistik tillgänglig för vald period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurs</TableHead>
                    <TableHead className="text-right">Avklarade (30d)</TableHead>
                    <TableHead className="text-right">Snittresultat</TableHead>
                    <TableHead className="text-right">Underkända</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => {
                    return (
                      <TableRow key={course.course_id}>
                        <TableCell>
                          <div className="font-medium">{course.title || 'Okänd kurs'}</div>
                          {course.tenant_name && (
                            <div className="text-xs text-muted-foreground">{course.tenant_name}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="default" className="font-mono">
                            {course.completions_30d}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {course.avg_score_30d !== null ? (
                            <Badge 
                              variant={course.avg_score_30d >= 70 ? 'default' : 'secondary'}
                              className="font-mono"
                            >
                              {Math.round(course.avg_score_30d)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {course.fail_rate_30d !== null && course.fail_rate_30d > 0 ? (
                            <Badge variant="destructive" className="font-mono gap-1">
                              <XCircleIcon className="h-3 w-3" />
                              {Math.round(course.fail_rate_30d)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0%</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
