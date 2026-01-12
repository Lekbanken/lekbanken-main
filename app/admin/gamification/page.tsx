'use client';

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  CurrencyDollarIcon,
  TrophyIcon,
  ShoppingBagIcon,
  DocumentArrowDownIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Card, CardContent, Badge } from "@/components/ui";

type ModuleStatus = "implemented" | "partial" | "planned";

interface GamificationModule {
  id: string;
  titleKey: string;
  descriptionKey: string;
  href: string;
  icon: React.ReactNode;
  status: ModuleStatus;
  featureKeys: string[];
  statKeys?: { labelKey: string; value: string | number }[];
}

const moduleDefinitions: Omit<GamificationModule, 'icon'>[] = [
  {
    id: "dashboard",
    titleKey: "modules.dashboard.title",
    descriptionKey: "modules.dashboard.description",
    href: "/admin/gamification/dashboard",
    status: "implemented",
    featureKeys: ["modules.dashboard.features.mintRate", "modules.dashboard.features.burnRate", "modules.dashboard.features.topEarners", "modules.dashboard.features.ruleToggles", "modules.dashboard.features.abuseDetection"],
    statKeys: [
      { labelKey: "modules.dashboard.stats.activeToday", value: "89" },
      { labelKey: "modules.dashboard.stats.net24h", value: "+778" },
    ],
  },
  {
    id: "dicecoin-xp",
    titleKey: "modules.dicecoinXp.title",
    descriptionKey: "modules.dicecoinXp.description",
    href: "/admin/gamification/dicecoin-xp",
    status: "implemented",
    featureKeys: ["modules.dicecoinXp.features.xpRules", "modules.dicecoinXp.features.levels", "modules.dicecoinXp.features.leaderboards", "modules.dicecoinXp.features.coinTransactions"],
    statKeys: [
      { labelKey: "modules.dicecoinXp.stats.activePlayers", value: "1,234" },
      { labelKey: "modules.dicecoinXp.stats.levels", value: 25 },
    ],
  },
  {
    id: "achievements",
    titleKey: "modules.achievements.title",
    descriptionKey: "modules.achievements.description",
    href: "/admin/gamification/achievements",
    status: "partial",
    featureKeys: ["modules.achievements.features.badgeLibrary", "modules.achievements.features.tierSystem", "modules.achievements.features.triggerRules", "modules.achievements.features.rewardConnection"],
    statKeys: [
      { labelKey: "modules.achievements.stats.badges", value: 48 },
      { labelKey: "modules.achievements.stats.activeTriggers", value: 12 },
    ],
  },
  {
    id: "shop-rewards",
    titleKey: "modules.shopRewards.title",
    descriptionKey: "modules.shopRewards.description",
    href: "/admin/gamification/shop-rewards",
    status: "implemented",
    featureKeys: ["modules.shopRewards.features.shopItems", "modules.shopRewards.features.pricing", "modules.shopRewards.features.inventory", "modules.shopRewards.features.purchaseHistory"],
    statKeys: [
      { labelKey: "modules.shopRewards.stats.items", value: 24 },
      { labelKey: "modules.shopRewards.stats.purchasesToday", value: 156 },
    ],
  },
  {
    id: "library-exports",
    titleKey: "modules.libraryExports.title",
    descriptionKey: "modules.libraryExports.description",
    href: "/admin/gamification/library-exports",
    status: "planned",
    featureKeys: ["modules.libraryExports.features.exportTemplates", "modules.libraryExports.features.formatSelection", "modules.libraryExports.features.versioning", "modules.libraryExports.features.exportLog"],
    statKeys: [
      { labelKey: "modules.libraryExports.stats.templates", value: 0 },
      { labelKey: "modules.libraryExports.stats.exports", value: 0 },
    ],
  },
];

const moduleIcons: Record<string, React.ReactNode> = {
  dashboard: <PresentationChartLineIcon className="h-8 w-8" />,
  "dicecoin-xp": <CurrencyDollarIcon className="h-8 w-8" />,
  achievements: <TrophyIcon className="h-8 w-8" />,
  "shop-rewards": <ShoppingBagIcon className="h-8 w-8" />,
  "library-exports": <DocumentArrowDownIcon className="h-8 w-8" />,
};

export default function GamificationHubPage() {
  const t = useTranslations('admin.gamification.hub');

  const statusConfig = useMemo(() => ({
    implemented: { label: t('status.implemented'), variant: "default" as const },
    partial: { label: t('status.partial'), variant: "secondary" as const },
    planned: { label: t('status.planned'), variant: "outline" as const },
  }), [t]);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.admin'), href: "/admin" },
          { label: t('breadcrumbs.gamification') },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
      />

      {/* Quick Stats */}
      <AdminStatGrid cols={4} className="mb-8">
        <AdminStatCard
          label={t('stats.activePlayers')}
          value="1,234"
          icon={<UserGroupIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label={t('stats.totalXpAwarded')}
          value="2.4M"
          icon={<SparklesIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label={t('stats.achievementsUnlocked')}
          value="8,912"
          icon={<TrophyIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label={t('stats.purchasesThisWeek')}
          value="342"
          icon={<ChartBarIcon className="h-5 w-5" />}
          iconColor="blue"
        />
      </AdminStatGrid>

      {/* Module Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {moduleDefinitions.map((module) => (
          <Link key={module.id} href={module.href} className="group">
            <Card className="h-full transition-all hover:border-primary hover:shadow-md">
              <CardContent className="p-6">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {moduleIcons[module.id]}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{t(module.titleKey)}</h3>
                      <Badge variant={statusConfig[module.status].variant} className="mt-1">
                        {statusConfig[module.status].label}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>

                {/* Description */}
                <p className="mb-4 text-sm text-muted-foreground">{t(module.descriptionKey)}</p>

                {/* Features */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {module.featureKeys.slice(0, 4).map((featureKey) => (
                    <span
                      key={featureKey}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {t(featureKey)}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                {module.statKeys && module.statKeys.length > 0 && (
                  <div className="flex gap-6 border-t border-border pt-4">
                    {module.statKeys.map((stat) => (
                      <div key={stat.labelKey}>
                        <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{t(stat.labelKey)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminPageLayout>
  );
}
