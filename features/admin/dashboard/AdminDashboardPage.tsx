"use client";

import { useTranslations } from "next-intl";
import {
  UsersIcon,
  BuildingOfficeIcon,
  TrophyIcon,
  RectangleGroupIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { OverviewStats } from "./components/OverviewStats";
import { QuickLinks } from "./components/QuickLinks";
import { ActivityFeed } from "./components/ActivityFeed";
import type { ActivityItem, OverviewMetric, QuickLinkItem } from "./types";

// Activity items are mock data - these would come from an API in production
const activity: ActivityItem[] = [
  { id: "1", type: "user_created", message: "New user invited: alex.berg@lekbanken.test", createdAt: "2025-12-15T10:00:00Z", createdAtLabel: "Just now", status: "info" },
  { id: "2", type: "organisation_created", message: "Organisation added: Sunrise Schools", createdAt: "2025-12-15T09:25:00Z", createdAtLabel: "35m ago", status: "success" },
  { id: "3", type: "achievement_created", message: "Achievement published: Core Pathfinder", createdAt: "2025-12-15T08:30:00Z", createdAtLabel: "1h ago", status: "success" },
  { id: "4", type: "product_updated", message: "Product updated: Gamification Pro capabilities", createdAt: "2025-12-15T06:00:00Z", createdAtLabel: "4h ago", status: "info" },
  { id: "5", type: "license_updated", message: "License warning: 3 orgs near seat limit", createdAt: "2025-12-15T04:00:00Z", createdAtLabel: "6h ago", status: "warning" },
];

export function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard');

  const metrics: OverviewMetric[] = [
    {
      id: "users",
      label: t('metrics.totalUsers'),
      value: "2,847",
      change: t('metrics.change30d', { percent: 12 }),
      trend: "up",
      icon: <UsersIcon className="h-5 w-5" />,
      iconGradient: "from-blue-500 to-indigo-600",
    },
    {
      id: "orgs",
      label: t('metrics.organisations'),
      value: "184",
      change: t('metrics.change30d', { percent: 4 }),
      trend: "up",
      icon: <BuildingOfficeIcon className="h-5 w-5" />,
      iconGradient: "from-emerald-500 to-teal-600",
    },
    {
      id: "achievements",
      label: t('metrics.achievementsCreated'),
      value: "48",
      change: t('metrics.changeWeek', { count: 7 }),
      trend: "up",
      icon: <TrophyIcon className="h-5 w-5" />,
      iconGradient: "from-amber-500 to-orange-600",
    },
    {
      id: "products",
      label: t('metrics.activeProducts'),
      value: "12",
      change: t('metrics.stable'),
      trend: "flat",
      icon: <RectangleGroupIcon className="h-5 w-5" />,
      iconGradient: "from-primary to-purple-600",
    },
  ];

  const quickLinks: QuickLinkItem[] = [
    {
      id: "users",
      label: t('quickLinks.userAdmin'),
      description: t('quickLinks.userAdminDesc'),
      href: "/admin/users",
      icon: <UsersIcon className="h-5 w-5" />,
      iconGradient: "from-blue-500 to-indigo-600",
    },
    {
      id: "organisations",
      label: t('quickLinks.orgAdmin'),
      description: t('quickLinks.orgAdminDesc'),
      href: "/admin/organisations",
      icon: <BuildingOfficeIcon className="h-5 w-5" />,
      iconGradient: "from-emerald-500 to-teal-600",
    },
    {
      id: "products",
      label: t('quickLinks.productAdmin'),
      description: t('quickLinks.productAdminDesc'),
      href: "/admin/products",
      icon: <RectangleGroupIcon className="h-5 w-5" />,
      iconGradient: "from-amber-500 to-orange-600",
    },
    {
      id: "achievements",
      label: t('quickLinks.achievementsAdmin'),
      description: t('quickLinks.achievementsAdminDesc'),
      href: "/admin/achievements",
      icon: <TrophyIcon className="h-5 w-5" />,
      iconGradient: "from-primary to-purple-600",
    },
  ];
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Icon Container */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary shadow-sm ring-1 ring-primary/10">
            <HomeIcon className="h-6 w-6" />
          </div>
          <div>
            {/* Breadcrumb */}
            <nav className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t('breadcrumb.admin')}</span>
              <span>/</span>
              <span>{t('breadcrumb.overview')}</span>
            </nav>
            {/* Title */}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t('pageTitle')}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('pageDescription')}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" href="/admin/support" size="sm" className="gap-1.5">
            <QuestionMarkCircleIcon className="h-4 w-4" />
            {t('support')}
          </Button>
          <Button href="/admin/settings" size="sm" className="gap-1.5">
            <Cog6ToothIcon className="h-4 w-4" />
            {t('settings')}
          </Button>
        </div>
      </header>

      {/* Overview Stats */}
      <section>
        <OverviewStats metrics={metrics} />
      </section>

      {/* Quick Links */}
      <section>
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <RectangleGroupIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">{t('quickLinks.title')}</CardTitle>
                <p className="text-xs text-muted-foreground">{t('quickLinks.subtitle')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <QuickLinks items={quickLinks} />
          </CardContent>
        </Card>
      </section>

      {/* Activity Feed */}
      <section>
        <ActivityFeed items={activity} />
      </section>
    </div>
  );
}
