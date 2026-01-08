'use client';

import Link from "next/link";
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
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status: ModuleStatus;
  features: string[];
  stats?: { label: string; value: string | number }[];
}

const statusConfig: Record<ModuleStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  implemented: { label: "Implementerad", variant: "default" },
  partial: { label: "Delvis", variant: "secondary" },
  planned: { label: "Planerad", variant: "outline" },
};

const modules: GamificationModule[] = [
  {
    id: "dashboard",
    title: "Economy Dashboard",
    description: "Övervaka mint/burn-rates, topptjänare och misstänkt aktivitet i realtid.",
    href: "/admin/gamification/dashboard",
    icon: <PresentationChartLineIcon className="h-8 w-8" />,
    status: "implemented",
    features: ["Mint Rate", "Burn Rate", "Top Earners", "Rule Toggles", "Abuse Detection"],
    stats: [
      { label: "Aktiva idag", value: "89" },
      { label: "Netto 24h", value: "+778" },
    ],
  },
  {
    id: "dicecoin-xp",
    title: "DiceCoin & XP",
    description: "Hantera progression, nivåer, XP-regler och leaderboards för att engagera användare.",
    href: "/admin/gamification/dicecoin-xp",
    icon: <CurrencyDollarIcon className="h-8 w-8" />,
    status: "implemented",
    features: ["XP-regler", "Nivåer", "Leaderboards", "Coin-transaktioner"],
    stats: [
      { label: "Aktiva spelare", value: "1,234" },
      { label: "Nivåer", value: 25 },
    ],
  },
  {
    id: "achievements",
    title: "Achievements",
    description: "Administrera achievements, badges, tiers och belöningskriterier.",
    href: "/admin/gamification/achievements",
    icon: <TrophyIcon className="h-8 w-8" />,
    status: "partial",
    features: ["Badge-bibliotek", "Tier-system", "Trigger-regler", "Reward-koppling"],
    stats: [
      { label: "Badges", value: 48 },
      { label: "Aktiva triggers", value: 12 },
    ],
  },
  {
    id: "shop-rewards",
    title: "Shop & Rewards",
    description: "Hantera butik, belöningar, priser och tillgänglighetsregler.",
    href: "/admin/gamification/shop-rewards",
    icon: <ShoppingBagIcon className="h-8 w-8" />,
    status: "implemented",
    features: ["Butik-items", "Prissättning", "Inventory", "Köphistorik"],
    stats: [
      { label: "Items", value: 24 },
      { label: "Köp idag", value: 156 },
    ],
  },
  {
    id: "library-exports",
    title: "Library Exports",
    description: "Exportpaket från biblioteket – CSV, PDF och brandade exports.",
    href: "/admin/gamification/library-exports",
    icon: <DocumentArrowDownIcon className="h-8 w-8" />,
    status: "planned",
    features: ["Export-mallar", "Format-val", "Versioning", "Export-logg"],
    stats: [
      { label: "Mallar", value: 0 },
      { label: "Exports", value: 0 },
    ],
  },
];

export default function GamificationHubPage() {
  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Gamification hub" },
        ]}
      />

      <AdminPageHeader
        title="Gamification hub"
        description="Centralt nav för alla gamification-funktioner: progression, achievements, belöningar och exports."
      />

      {/* Quick Stats */}
      <AdminStatGrid cols={4} className="mb-8">
        <AdminStatCard
          label="Aktiva spelare"
          value="1,234"
          icon={<UserGroupIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Totalt XP utdelat"
          value="2.4M"
          icon={<SparklesIcon className="h-5 w-5" />}
          iconColor="amber"
        />
        <AdminStatCard
          label="Achievements låsta upp"
          value="8,912"
          icon={<TrophyIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Köp denna vecka"
          value="342"
          icon={<ChartBarIcon className="h-5 w-5" />}
          iconColor="blue"
        />
      </AdminStatGrid>

      {/* Module Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <Link key={module.id} href={module.href} className="group">
            <Card className="h-full transition-all hover:border-primary hover:shadow-md">
              <CardContent className="p-6">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {module.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{module.title}</h3>
                      <Badge variant={statusConfig[module.status].variant} className="mt-1">
                        {statusConfig[module.status].label}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>

                {/* Description */}
                <p className="mb-4 text-sm text-muted-foreground">{module.description}</p>

                {/* Features */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {module.features.slice(0, 4).map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                {module.stats && module.stats.length > 0 && (
                  <div className="flex gap-6 border-t border-border pt-4">
                    {module.stats.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
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
