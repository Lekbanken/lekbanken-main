"use client";

import {
  UsersIcon,
  BuildingOfficeIcon,
  TrophyIcon,
  RectangleGroupIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { OverviewStats } from "./components/OverviewStats";
import { QuickLinks } from "./components/QuickLinks";
import { ActivityFeed } from "./components/ActivityFeed";
import type { ActivityItem, OverviewMetric, QuickLinkItem } from "./types";

const metrics: OverviewMetric[] = [
  {
    id: "users",
    label: "Total users",
    value: "2,847",
    change: "+12% last 30d",
    trend: "up",
    icon: <UsersIcon className="h-5 w-5" />,
    iconGradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "orgs",
    label: "Organisations",
    value: "184",
    change: "+4% last 30d",
    trend: "up",
    icon: <BuildingOfficeIcon className="h-5 w-5" />,
    iconGradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "achievements",
    label: "Achievements created",
    value: "48",
    change: "+7 this week",
    trend: "up",
    icon: <TrophyIcon className="h-5 w-5" />,
    iconGradient: "from-amber-500 to-orange-600",
  },
  {
    id: "products",
    label: "Active products",
    value: "12",
    change: "Stable",
    trend: "flat",
    icon: <RectangleGroupIcon className="h-5 w-5" />,
    iconGradient: "from-primary to-purple-600",
  },
];

const quickLinks: QuickLinkItem[] = [
  {
    id: "users",
    label: "User Admin",
    description: "Manage roles, access, and invites.",
    href: "/admin/users",
    icon: <UsersIcon className="h-5 w-5" />,
    iconGradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "organisations",
    label: "Organisation Admin",
    description: "Licenses, contacts, member oversight.",
    href: "/admin/organisations",
    icon: <BuildingOfficeIcon className="h-5 w-5" />,
    iconGradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "products",
    label: "Product Admin",
    description: "Products, capabilities, availability.",
    href: "/admin/products",
    icon: <RectangleGroupIcon className="h-5 w-5" />,
    iconGradient: "from-amber-500 to-orange-600",
  },
  {
    id: "achievements",
    label: "Achievements Admin",
    description: "Badge builder and rewards.",
    href: "/admin/achievements",
    icon: <TrophyIcon className="h-5 w-5" />,
    iconGradient: "from-primary to-purple-600",
  },
];

const activity: ActivityItem[] = [
  { id: "1", type: "user_created", message: "New user invited: alex.berg@lekbanken.test", createdAt: new Date().toISOString(), status: "info" },
  { id: "2", type: "organisation_created", message: "Organisation added: Sunrise Schools", createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), status: "success" },
  { id: "3", type: "achievement_created", message: "Achievement published: Core Pathfinder", createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), status: "success" },
  { id: "4", type: "product_updated", message: "Product updated: Gamification Pro capabilities", createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), status: "info" },
  { id: "5", type: "license_updated", message: "License warning: 3 orgs near seat limit", createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(), status: "warning" },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quick health check and entry points for admin areas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" href="/admin/support" size="sm">
            Support
          </Button>
          <Button href="/admin/settings" size="sm">
            <Cog6ToothIcon className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <OverviewStats metrics={metrics} />

      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <QuickLinks items={quickLinks} />
        </CardContent>
      </Card>

      <ActivityFeed items={activity} />
    </div>
  );
}
