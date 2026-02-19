'use client';

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AcademicCapIcon,
  MapIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Card, CardContent, Badge, Select } from "@/components/ui";
import {
  getLearningHubStats,
  listTenantsForLearningAdmin,
  checkIsSystemAdmin,
  type LearningHubStats,
  type TenantOption,
} from "@/app/actions/learning-admin";

type ModuleStatus = "implemented" | "partial" | "planned";

interface LearningModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status: ModuleStatus;
  features: string[];
}

export default function LearningHubPage() {
  const t = useTranslations('admin.learning.hub');
  const [stats, setStats] = useState<LearningHubStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'tenant'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('');

  const statusConfig: Record<ModuleStatus, { label: string; variant: "default" | "secondary" | "outline" }> = useMemo(() => ({
    implemented: { label: t('status.implemented'), variant: "default" },
    partial: { label: t('status.partial'), variant: "secondary" },
    planned: { label: t('status.planned'), variant: "outline" },
  }), [t]);

  const modules: LearningModule[] = useMemo(() => [
    {
      id: "courses",
      title: t('modules.courses.title'),
      description: t('modules.courses.description'),
      href: "/admin/learning/courses",
      icon: <BookOpenIcon className="h-8 w-8" />,
      status: "implemented" as ModuleStatus,
      features: [
        t('modules.courses.features.courseContent'),
        t('modules.courses.features.quizBuilder'),
        t('modules.courses.features.rewards'),
        t('modules.courses.features.scopeManagement'),
      ],
    },
    {
      id: "paths",
      title: t('modules.paths.title'),
      description: t('modules.paths.description'),
      href: "/admin/learning/paths",
      icon: <MapIcon className="h-8 w-8" />,
      status: "partial" as ModuleStatus,
      features: [
        t('modules.paths.features.viewOnly'),
        t('modules.paths.features.graphEditor'),
        t('modules.paths.features.prerequisites'),
        t('modules.paths.features.roleBased'),
      ],
    },
    {
      id: "requirements",
      title: t('modules.requirements.title'),
      description: t('modules.requirements.description'),
      href: "/admin/learning/requirements",
      icon: <ShieldCheckIcon className="h-8 w-8" />,
      status: "implemented" as ModuleStatus,
      features: [
        t('modules.requirements.features.activityRequirements'),
        t('modules.requirements.features.roleRequirements'),
        t('modules.requirements.features.gameRequirements'),
        t('modules.requirements.features.toggleActive'),
      ],
    },
    {
      id: "reports",
      title: t('modules.reports.title'),
      description: t('modules.reports.description'),
      href: "/admin/learning/reports",
      icon: <ChartBarIcon className="h-8 w-8" />,
      status: "partial" as ModuleStatus,
      features: [
        t('modules.reports.features.progressOverview'),
        t('modules.reports.features.courseStats'),
        t('modules.reports.features.userReports'),
        t('modules.reports.features.export'),
      ],
    },
  ], [t]);

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

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await getLearningHubStats({
          scope: isSystemAdmin ? scopeFilter : 'all',
          tenantId: tenantFilter || undefined,
        });
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, [scopeFilter, tenantFilter, isSystemAdmin]);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbLabel'), href: "/admin/learning" },
        ]}
      />
      
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<AcademicCapIcon className="h-8 w-8" />}
      />

      {/* Scope Filters (System Admin Only) */}
      {isSystemAdmin && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
            options={[
              { value: 'all', label: t('filters.all') },
              { value: 'global', label: t('filters.global') },
              { value: 'tenant', label: t('filters.tenant') },
            ]}
          />

          {scopeFilter === 'tenant' && (
            <Select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              options={[
                { value: '', label: t('filters.selectOrganization') },
                ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })),
              ]}
            />
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpenIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '...' : stats?.courses.active ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">{t('stats.activeCourses')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <MapIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '...' : stats?.paths.total ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">{t('stats.paths')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <ShieldCheckIcon className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '...' : stats?.requirements.active ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">{t('stats.activeRequirements')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AcademicCapIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? '...' : stats?.courses.total ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">{t('stats.totalCourses')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {modules.map((module) => {
          const statusInfo = statusConfig[module.status];
          return (
            <Card key={module.id} className="overflow-hidden">
              <CardContent className="p-0">
                <Link href={module.href} className="block p-6 transition-colors hover:bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {module.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{module.title}</h3>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {module.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sandbox Link */}
      <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">{t('sandbox.title')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('sandbox.description')}
            </p>
          </div>
          <Link
            href="/sandbox/learning"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {t('sandbox.open')}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AdminPageLayout>
  );
}
